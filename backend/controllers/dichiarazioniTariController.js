const DichiarazioneTARI = require('../models/DichiarazioneTARI');
const { calcolaDichiarazioneTARI } = require('../services/calcoloTARES');
const kafkaProducer = require('../services/kafkaProducer');
const stampaService = require('../services/stampaService');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, anno, stato, contribuente } = req.query;
  const query = {};
  if (anno)        query.anno = Number(anno);
  if (stato)       query.stato = stato;
  if (contribuente)query.contribuente = contribuente;

  const [data, total] = await Promise.all([
    DichiarazioneTARI.find(query)
      .populate('contribuente', 'codiceFiscale cognome nome ragioneSociale')
      .populate('operatore', 'nome cognome')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    DichiarazioneTARI.countDocuments(query),
  ]);
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const d = await DichiarazioneTARI.findById(req.params.id)
    .populate('contribuente')
    .populate('righe.utenza')
    .populate('righe.tariffaApplicata')
    .populate('operatore', 'nome cognome')
    .populate('storiaStati.utente', 'nome cognome');
  if (!d) return res.status(404).json({ success: false, message: 'Dichiarazione TARI non trovata' });
  res.json({ success: true, data: d });
});

exports.create = asyncHandler(async (req, res) => {
  const d = await DichiarazioneTARI.create({
    ...req.body,
    operatore: req.utente._id,
    storiaStati: [{ stato: 'bozza', utente: req.utente._id, nota: 'Creazione' }],
  });
  // Pubblica evento Kafka
  try {
    await kafkaProducer.send('tari.dichiarazioni.created', {
      key: d._id.toString(),
      value: { evento: 'dichiarazione_tari_creata', data: d },
    });
  } catch { /* non-blocking */ }
  res.status(201).json({ success: true, data: d });
});

exports.update = asyncHandler(async (req, res) => {
  const d = await DichiarazioneTARI.findById(req.params.id);
  if (!d) return res.status(404).json({ success: false, message: 'Dichiarazione TARI non trovata' });
  if (['annullata', 'definita'].includes(d.stato)) {
    return res.status(400).json({ success: false, message: `Impossibile modificare una dichiarazione in stato: ${d.stato}` });
  }
  const { stato, ...dati } = req.body;
  Object.assign(d, dati, { modificatoDA: req.utente._id });
  await d.save();
  res.json({ success: true, data: d });
});

exports.annulla = asyncHandler(async (req, res) => {
  const d = await DichiarazioneTARI.findById(req.params.id);
  if (!d) return res.status(404).json({ success: false, message: 'Dichiarazione TARI non trovata' });
  if (d.stato === 'annullata') return res.status(400).json({ success: false, message: 'Già annullata' });
  d.stato = 'annullata';
  d.motivoAnnullamento = req.body.motivazione || 'Annullamento operatore';
  d.modificatoDA = req.utente._id;
  d.storiaStati.push({ stato: 'annullata', utente: req.utente._id, nota: d.motivoAnnullamento });
  await d.save();
  res.json({ success: true, data: d });
});

exports.cambiaStato = asyncHandler(async (req, res) => {
  const { stato, nota } = req.body;
  const TRANSIZIONI = {
    bozza:         ['presentata', 'annullata'],
    presentata:    ['in_lavorazione', 'annullata'],
    in_lavorazione:['definita', 'annullata'],
    definita:      ['rettificata'],
    rettificata:   ['definita', 'annullata'],
  };

  const d = await DichiarazioneTARI.findById(req.params.id);
  if (!d) return res.status(404).json({ success: false, message: 'Dichiarazione TARI non trovata' });

  const permessi = TRANSIZIONI[d.stato] || [];
  if (!permessi.includes(stato)) {
    return res.status(400).json({ success: false, message: `Transizione non ammessa: ${d.stato} → ${stato}` });
  }

  d.stato = stato;
  if (stato === 'presentata') d.dataPresentazione = new Date();
  d.storiaStati.push({ stato, utente: req.utente._id, nota });
  await d.save();
  res.json({ success: true, data: d });
});

exports.calcola = asyncHandler(async (req, res) => {
  const d = await DichiarazioneTARI.findById(req.params.id)
    .populate('righe.utenza');
  if (!d) return res.status(404).json({ success: false, message: 'Dichiarazione TARI non trovata' });

  const comune = req.body.comune || process.env.COMUNE_NOME || 'Comune';
  const calc = await calcolaDichiarazioneTARI(d, comune, d.anno);

  Object.assign(d, {
    righe:               calc.righe,
    totaleAnno:          calc.totaleAnno,
    importoPrimaRata:    calc.importoPrimaRata,
    scadenzaPrimaRata:   calc.scadenzaPrimaRata,
    importoSecondaRata:  calc.importoSecondaRata,
    scadenzaSecondaRata: calc.scadenzaSecondaRata,
    importoSaldo:        calc.importoSaldo,
    scadenzaSaldo:       calc.scadenzaSaldo,
  });
  await d.save();

  res.json({ success: true, data: d, calcolo: calc });
});

exports.stampa = asyncHandler(async (req, res) => {
  const d = await DichiarazioneTARI.findById(req.params.id)
    .populate('contribuente')
    .populate('righe.utenza')
    .populate('righe.tariffaApplicata')
    .populate('operatore');
  if (!d) return res.status(404).json({ success: false, message: 'Dichiarazione TARI non trovata' });
  const filePath = await stampaService.stampaDichiarazioneTARI(d);
  res.download(filePath);
});
