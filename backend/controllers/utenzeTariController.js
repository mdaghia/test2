const UtenzaTARI = require('../models/UtenzaTARI');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, anno, contribuente, tipo, stato = 'attiva', comune } = req.query;
  const query = {};
  if (anno)        query.anno = Number(anno);
  if (contribuente)query.contribuente = contribuente;
  if (tipo)        query.tipo = tipo;
  if (stato)       query.stato = stato;
  if (comune)      query.comune = new RegExp(comune, 'i');

  const [data, total] = await Promise.all([
    UtenzaTARI.find(query)
      .populate('contribuente', 'codiceFiscale cognome nome ragioneSociale')
      .populate('immobile', 'indirizzo categoriaCatastale')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    UtenzaTARI.countDocuments(query),
  ]);
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const u = await UtenzaTARI.findById(req.params.id)
    .populate('contribuente').populate('immobile').populate('storiaStati.utente', 'nome cognome');
  if (!u) return res.status(404).json({ success: false, message: 'Utenza non trovata' });
  res.json({ success: true, data: u });
});

exports.create = asyncHandler(async (req, res) => {
  const u = await UtenzaTARI.create({
    ...req.body,
    creatoDA: req.utente._id,
    storiaStati: [{ stato: 'attiva', utente: req.utente._id, nota: 'Creazione utenza' }],
  });
  res.status(201).json({ success: true, data: u });
});

exports.update = asyncHandler(async (req, res) => {
  const u = await UtenzaTARI.findById(req.params.id);
  if (!u) return res.status(404).json({ success: false, message: 'Utenza non trovata' });
  if (u.stato === 'annullata') return res.status(400).json({ success: false, message: 'Impossibile modificare un\'utenza annullata' });
  Object.assign(u, req.body, { modificatoDA: req.utente._id });
  await u.save();
  res.json({ success: true, data: u });
});

exports.annulla = asyncHandler(async (req, res) => {
  const u = await UtenzaTARI.findById(req.params.id);
  if (!u) return res.status(404).json({ success: false, message: 'Utenza non trovata' });
  if (u.stato === 'annullata') return res.status(400).json({ success: false, message: 'Già annullata' });
  u.stato = 'annullata';
  u.motivoAnnullamento = req.body.motivazione || 'Annullamento operatore';
  u.modificatoDA = req.utente._id;
  u.storiaStati.push({ stato: 'annullata', utente: req.utente._id, nota: u.motivoAnnullamento });
  await u.save();
  res.json({ success: true, data: u });
});

exports.cambiaStato = asyncHandler(async (req, res) => {
  const { stato, nota } = req.body;
  const u = await UtenzaTARI.findById(req.params.id);
  if (!u) return res.status(404).json({ success: false, message: 'Utenza non trovata' });
  u.stato = stato;
  u.storiaStati.push({ stato, utente: req.utente._id, nota });
  await u.save();
  res.json({ success: true, data: u });
});

// Utenze per contribuente (usata dalla dichiarazione per autocomplete)
exports.perContribuente = asyncHandler(async (req, res) => {
  const { contribuenteId, anno } = req.query;
  const query = { contribuente: contribuenteId, stato: { $ne: 'annullata' } };
  if (anno) query.anno = Number(anno);
  const data = await UtenzaTARI.find(query).populate('immobile', 'indirizzo');
  res.json({ success: true, data });
});
