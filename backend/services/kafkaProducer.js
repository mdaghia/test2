const { getProducer, TOPICS } = require('../config/kafka');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

async function send(topic, messages) {
  const producer = getProducer();
  const payload = Array.isArray(messages) ? messages : [messages];
  await producer.send({
    topic,
    messages: payload.map(m => ({
      key:   m.key || uuidv4(),
      value: JSON.stringify(m.value || m),
      headers: { source: 'tax-api', ts: String(Date.now()) },
    })),
  });
  logger.debug(`Kafka → [${topic}] ${payload.length} msg`);
}

module.exports = {
  async dichiarazioneCreata(dichiarazione) {
    await send(TOPICS.DICHIARAZIONI_CREATED, {
      key: dichiarazione._id.toString(),
      value: { evento: 'dichiarazione_creata', data: dichiarazione },
    });
  },

  async richiestaCalcolo(jobId, parametri) {
    await send(TOPICS.CALCOLO_RICHIESTO, {
      key: jobId,
      value: { jobId, parametri, ts: new Date() },
    });
  },

  async richiestaEmissioneAtti(jobId, parametri) {
    await send(TOPICS.ATTI_EMISSIONE, {
      key: jobId,
      value: { jobId, parametri, ts: new Date() },
    });
  },

  async richiestaSammeMassive(jobId, tipoStampa, parametri) {
    await send(TOPICS.STAMPE_MASSIVE, {
      key: jobId,
      value: { jobId, tipoStampa, parametri, ts: new Date() },
    });
  },

  async notificaContribuente(contribuenteId, tipo, dati) {
    await send(TOPICS.NOTIFICHE_CONTRIBUENTI, {
      key: contribuenteId.toString(),
      value: { contribuenteId, tipo, dati, ts: new Date() },
    });
  },

  async versamentoRiconciliazione(versamentoId, dati) {
    await send(TOPICS.VERSAMENTI_RICONCILIA, {
      key: versamentoId.toString(),
      value: { versamentoId, dati, ts: new Date() },
    });
  },
};
