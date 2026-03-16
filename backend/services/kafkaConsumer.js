/**
 * Kafka Consumer Service
 * Gestisce l'elaborazione asincrona massiva:
 *   - Calcolo IMU massivo
 *   - Emissione massiva atti
 *   - Stampe massive
 *   - Riconciliazione versamenti
 */
const { getKafka, TOPICS } = require('../config/kafka');
const logger = require('../utils/logger');
const DichiarazioneIMU = require('../models/DichiarazioneIMU');
const AttoProvvedimento = require('../models/AttoProvvedimento');
const ElaborazioneMassiva = require('../models/ElaborazioneMassiva');
const { calcolaDichiarazioneIMU } = require('./calcoloIMU');
const stampaService = require('./stampaService');

const GROUP_ID = 'tax-management-consumers';

let consumer;

async function startConsumers() {
  const kafka = getKafka();
  consumer = kafka.consumer({ groupId: GROUP_ID });
  await consumer.connect();

  await consumer.subscribe({
    topics: [
      TOPICS.CALCOLO_RICHIESTO,
      TOPICS.ATTI_EMISSIONE,
      TOPICS.STAMPE_MASSIVE,
      TOPICS.VERSAMENTI_RICONCILIA,
    ],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        logger.debug(`Kafka ← [${topic}] key=${message.key?.toString()}`);

        switch (topic) {
          case TOPICS.CALCOLO_RICHIESTO:
            await handleCalcoloMassivo(payload);
            break;
          case TOPICS.ATTI_EMISSIONE:
            await handleEmissioneAttiMassiva(payload);
            break;
          case TOPICS.STAMPE_MASSIVE:
            await handleStampeMassive(payload);
            break;
          case TOPICS.VERSAMENTI_RICONCILIA:
            await handleRiconciliazioneVersamento(payload);
            break;
          default:
            logger.warn(`Topic non gestito: ${topic}`);
        }
      } catch (err) {
        logger.error(`Errore consumer [${topic}]: ${err.message}`, err);
      }
    },
  });

  logger.info('Kafka consumers avviati');
}

// ── Handlers ──────────────────────────────────────────────────────────────

async function handleCalcoloMassivo({ jobId, parametri }) {
  const elab = await ElaborazioneMassiva.findById(jobId);
  if (!elab) return logger.warn(`Elaborazione ${jobId} non trovata`);

  await elab.updateOne({ stato: 'in_elaborazione', dataInizio: new Date() });
  const start = Date.now();

  try {
    const query = { annoImposta: parametri.annoImposta, stato: { $in: ['presentata', 'in_lavorazione'] } };
    if (parametri.contribuenti?.length) query.contribuente = { $in: parametri.contribuenti };

    const dichiarazioni = await DichiarazioneIMU.find(query).populate('righe.immobile');
    await elab.updateOne({ totaleRecord: dichiarazioni.length });

    const risultati = [];
    const errori = [];

    for (const dich of dichiarazioni) {
      try {
        const calc = await calcolaDichiarazioneIMU(
          dich,
          parametri.comune || process.env.COMUNE_NOME,
          parametri.annoImposta,
        );
        await DichiarazioneIMU.findByIdAndUpdate(dich._id, {
          righe:            calc.righe,
          totaleImponibile: calc.totaleImponibile,
          totaleImposta:    calc.totaleImposta,
          totaleDovuto:     calc.totaleDovuto,
          importoAcconto:   calc.importoAcconto,
          importoSaldo:     calc.importoSaldo,
          stato: 'in_lavorazione',
        });
        risultati.push({ rifId: dich._id, stato: 'ok' });
        await elab.updateOne({ $inc: { recordElaborati: 1 } });
      } catch (err) {
        errori.push({ rifId: dich._id, errore: err.message });
        await elab.updateOne({ $inc: { recordErrore: 1 } });
      }
    }

    const statoFinale = errori.length === 0 ? 'completata' : 'completata_con_errori';
    await elab.updateOne({
      stato: statoFinale,
      dataCompletamento: new Date(),
      durataMsec: Date.now() - start,
      risultati,
      errori,
    });
    logger.info(`Calcolo massivo ${jobId}: ${risultati.length} OK, ${errori.length} errori`);
  } catch (err) {
    await elab.updateOne({ stato: 'fallita', errori: [{ errore: err.message }] });
    throw err;
  }
}

async function handleEmissioneAttiMassiva({ jobId, parametri }) {
  const elab = await ElaborazioneMassiva.findById(jobId);
  if (!elab) return;

  await elab.updateOne({ stato: 'in_elaborazione', dataInizio: new Date() });
  const start = Date.now();

  try {
    // Trova dichiarazioni definite con differenza positiva (a debito)
    const pipeline = [
      { $match: { annoImposta: parametri.annoImposta, stato: 'definita' } },
      { $lookup: { from: 'versamentoimu', localField: '_id', foreignField: 'dichiarazione', as: 'versamenti' } },
      { $addFields: { totaleVersato: { $sum: '$versamenti.importoVersato' } } },
      { $match: { $expr: { $gt: ['$totaleDovuto', '$totaleVersato'] } } },
    ];
    const dichConDifferenza = await DichiarazioneIMU.aggregate(pipeline);
    await elab.updateOne({ totaleRecord: dichConDifferenza.length });

    const risultati = [];
    for (const dich of dichConDifferenza) {
      const atto = await AttoProvvedimento.create({
        annoImposta:          parametri.annoImposta,
        tipoAtto:             'avviso_accertamento',
        contribuente:         dich.contribuente,
        dichiarazione:        dich._id,
        motivazione:          `Avviso di accertamento IMU ${parametri.annoImposta} - omesso/insufficiente versamento`,
        impostaDovuta:        dich.totaleDovuto,
        impostaVersata:       dich.totaleVersato,
        differenzaAccertata:  dich.totaleDovuto - dich.totaleVersato,
        sanzioni:             (dich.totaleDovuto - dich.totaleVersato) * 0.3,
        interessi:            (dich.totaleDovuto - dich.totaleVersato) * 0.025,
        dataEmissione:        new Date(),
        scadenzaPagamento:    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        operatore:            elab.richiestoDA,
      });
      risultati.push({ rifId: dich._id, stato: 'ok', attoId: atto._id });
      await elab.updateOne({ $inc: { recordElaborati: 1 } });
    }

    await elab.updateOne({
      stato: 'completata',
      dataCompletamento: new Date(),
      durataMsec: Date.now() - start,
      risultati,
    });
  } catch (err) {
    await elab.updateOne({ stato: 'fallita', errori: [{ errore: err.message }] });
    throw err;
  }
}

async function handleStampeMassive({ jobId, tipoStampa, parametri }) {
  const elab = await ElaborazioneMassiva.findById(jobId);
  if (!elab) return;

  await elab.updateOne({ stato: 'in_elaborazione', dataInizio: new Date() });
  const start = Date.now();

  try {
    const { fileOutput, count } = await stampaService.stampaMassiva(tipoStampa, parametri, jobId);
    await elab.updateOne({
      stato: 'completata',
      dataCompletamento: new Date(),
      durataMsec: Date.now() - start,
      totaleRecord: count,
      recordElaborati: count,
      fileOutput,
    });
  } catch (err) {
    await elab.updateOne({ stato: 'fallita', errori: [{ errore: err.message }] });
    throw err;
  }
}

async function handleRiconciliazioneVersamento({ versamentoId, dati }) {
  logger.info(`Riconciliazione versamento ${versamentoId}`);
  // Logica di riconciliazione con F24 / PagoPA
}

async function stopConsumers() {
  if (consumer) await consumer.disconnect();
}

module.exports = { startConsumers, stopConsumers };
