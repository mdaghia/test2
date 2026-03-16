const AttoProvvedimento = require('../models/AttoProvvedimento');
const ElaborazioneMassiva = require('../models/ElaborazioneMassiva');
const kafkaProducer = require('../services/kafkaProducer');
const stampaService = require('../services/stampaService');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, annoImposta, stato, tipoAtto, contribuente } = req.query;
  const query = {};
  if (annoImposta)  query.annoImposta = Number(annoImposta);
  if (stato)        query.stato = stato;
  if (tipoAtto)     query.tipoAtto = tipoAtto;
  if (contribuente) query.contribuente = contribuente;

  const [data, total] = await Promise.all([
    AttoProvvedimento.find(query)
      .populate('contribuente', 'codiceFiscale cognome nome ragioneSociale')
      .populate('operatore', 'nome cognome')
      .sort({ dataEmissione: -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    AttoProvvedimento.countDocuments(query),
  ]);
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const atto = await AttoProvvedimento.findById(req.params.id)
    .populate('contribuente').populate('dichiarazione').populate('operatore', 'nome cognome');
  if (!atto) return res.status(404).json({ success: false, message: 'Atto non trovato' });
  res.json({ success: true, data: atto });
});

exports.create = asyncHandler(async (req, res) => {
  const atto = await AttoProvvedimento.create({
    ...req.body,
    operatore: req.utente._id,
    storiaStati: [{ stato: 'bozza', utente: req.utente._id, nota: 'Creazione' }],
  });
  res.status(201).json({ success: true, data: atto });
});

exports.update = asyncHandler(async (req, res) => {
  const atto = await AttoProvvedimento.findById(req.params.id);
  if (!atto) return res.status(404).json({ success: false, message: 'Atto non trovato' });
  if (['annullato', 'pagato'].includes(atto.stato)) {
    return res.status(400).json({ success: false, message: `Impossibile modificare atto in stato: ${atto.stato}` });
  }
  Object.assign(atto, req.body, { modificatoDA: req.utente._id });
  await atto.save();
  res.json({ success: true, data: atto });
});

exports.annulla = asyncHandler(async (req, res) => {
  const atto = await AttoProvvedimento.findById(req.params.id);
  if (!atto) return res.status(404).json({ success: false, message: 'Atto non trovato' });
  if (atto.stato === 'annullato') return res.status(400).json({ success: false, message: 'Già annullato' });

  atto.stato = 'annullato';
  atto.motivoAnnullamento = req.body.motivazione || 'Annullamento operatore';
  atto.storiaStati.push({ stato: 'annullato', utente: req.utente._id, nota: atto.motivoAnnullamento });
  await atto.save();
  res.json({ success: true, data: atto });
});

exports.cambiaStato = asyncHandler(async (req, res) => {
  const { stato, nota } = req.body;
  const atto = await AttoProvvedimento.findById(req.params.id);
  if (!atto) return res.status(404).json({ success: false, message: 'Atto non trovato' });

  atto.stato = stato;
  if (stato === 'notificato') atto.dataNotifica = new Date();
  atto.storiaStati.push({ stato, utente: req.utente._id, nota });
  await atto.save();
  res.json({ success: true, data: atto });
});

exports.stampa = asyncHandler(async (req, res) => {
  const atto = await AttoProvvedimento.findById(req.params.id).populate('contribuente').populate('dichiarazione');
  if (!atto) return res.status(404).json({ success: false, message: 'Atto non trovato' });
  const filePath = await stampaService.stampaAttoProvvedimento(atto);
  atto.pathDocumento = filePath;
  atto.dataStampa = new Date();
  await atto.save();
  res.download(filePath);
});

// Emissione massiva atti via Kafka
exports.emissioneMassiva = asyncHandler(async (req, res) => {
  const elab = await ElaborazioneMassiva.create({
    tipoElaborazione: 'emissione_massiva_atti',
    descrizione: req.body.descrizione || `Emissione massiva atti anno ${req.body.annoImposta}`,
    parametri: req.body,
    richiestoDA: req.utente._id,
  });

  await kafkaProducer.richiestaEmissioneAtti(elab._id.toString(), req.body);
  res.status(202).json({ success: true, data: elab, message: 'Emissione massiva accodata' });
});
