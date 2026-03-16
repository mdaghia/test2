const VersamentoTARI = require('../models/VersamentoTARI');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, annoImposta, stato, contribuente, tipoRata } = req.query;
  const query = {};
  if (annoImposta)  query.annoImposta = Number(annoImposta);
  if (stato)        query.stato = stato;
  if (contribuente) query.contribuente = contribuente;
  if (tipoRata)     query.tipoRata = tipoRata;

  const [data, total] = await Promise.all([
    VersamentoTARI.find(query)
      .populate('contribuente', 'codiceFiscale cognome nome ragioneSociale')
      .populate('dichiarazione', 'numeroDichiarazione')
      .populate('operatore', 'nome cognome')
      .sort({ dataVersamento: -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    VersamentoTARI.countDocuments(query),
  ]);
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const v = await VersamentoTARI.findById(req.params.id)
    .populate('contribuente').populate('dichiarazione').populate('operatore', 'nome cognome');
  if (!v) return res.status(404).json({ success: false, message: 'Versamento TARI non trovato' });
  res.json({ success: true, data: v });
});

exports.create = asyncHandler(async (req, res) => {
  const v = await VersamentoTARI.create({ ...req.body, operatore: req.utente._id });
  res.status(201).json({ success: true, data: v });
});

exports.update = asyncHandler(async (req, res) => {
  const v = await VersamentoTARI.findById(req.params.id);
  if (!v) return res.status(404).json({ success: false, message: 'Versamento TARI non trovato' });
  if (v.stato === 'annullato') return res.status(400).json({ success: false, message: 'Versamento annullato' });
  Object.assign(v, req.body, { modificatoDA: req.utente._id });
  await v.save();
  res.json({ success: true, data: v });
});

exports.annulla = asyncHandler(async (req, res) => {
  const v = await VersamentoTARI.findById(req.params.id);
  if (!v) return res.status(404).json({ success: false, message: 'Versamento TARI non trovato' });
  v.stato = 'annullato';
  v.motivoAnnullamento = req.body.motivazione;
  v.modificatoDA = req.utente._id;
  await v.save();
  res.json({ success: true, data: v });
});

// Estratto conto per contribuente
exports.estrattoContribuente = asyncHandler(async (req, res) => {
  const { contribuenteId, annoImposta } = req.query;
  const match = { contribuente: contribuenteId };
  if (annoImposta) match.annoImposta = Number(annoImposta);
  const sommario = await VersamentoTARI.aggregate([
    { $match: match },
    { $group: {
      _id: { anno: '$annoImposta', tipoRata: '$tipoRata' },
      totaleVersato: { $sum: '$importoVersato' },
      totaleDovuto:  { $sum: '$importoDovuto' },
      count:         { $sum: 1 },
    }},
    { $sort: { '_id.anno': -1 } },
  ]);
  res.json({ success: true, data: sommario });
});
