const VersamentoIMU = require('../models/VersamentoIMU');
const { calcolaRavvedimento } = require('../services/calcoloIMU');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, annoImposta, stato, contribuente, tipoRata } = req.query;
  const query = {};
  if (annoImposta)  query.annoImposta = Number(annoImposta);
  if (stato)        query.stato = stato;
  if (contribuente) query.contribuente = contribuente;
  if (tipoRata)     query.tipoRata = tipoRata;

  const [data, total] = await Promise.all([
    VersamentoIMU.find(query)
      .populate('contribuente', 'codiceFiscale cognome nome ragioneSociale')
      .populate('dichiarazione', 'numeroDichiarazione')
      .populate('operatore', 'nome cognome')
      .sort({ dataVersamento: -1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    VersamentoIMU.countDocuments(query),
  ]);
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const ver = await VersamentoIMU.findById(req.params.id)
    .populate('contribuente').populate('dichiarazione').populate('operatore', 'nome cognome');
  if (!ver) return res.status(404).json({ success: false, message: 'Versamento non trovato' });
  res.json({ success: true, data: ver });
});

exports.create = asyncHandler(async (req, res) => {
  const ver = await VersamentoIMU.create({ ...req.body, operatore: req.utente._id });
  res.status(201).json({ success: true, data: ver });
});

exports.update = asyncHandler(async (req, res) => {
  const ver = await VersamentoIMU.findById(req.params.id);
  if (!ver) return res.status(404).json({ success: false, message: 'Versamento non trovato' });
  if (ver.stato === 'annullato') return res.status(400).json({ success: false, message: 'Versamento annullato' });
  Object.assign(ver, req.body, { modificatoDA: req.utente._id });
  await ver.save();
  res.json({ success: true, data: ver });
});

exports.annulla = asyncHandler(async (req, res) => {
  const ver = await VersamentoIMU.findById(req.params.id);
  if (!ver) return res.status(404).json({ success: false, message: 'Versamento non trovato' });
  ver.stato = 'annullato';
  ver.motivoAnnullamento = req.body.motivazione;
  ver.modificatoDA = req.utente._id;
  await ver.save();
  res.json({ success: true, data: ver });
});

exports.calcolaRavvedimento = asyncHandler(async (req, res) => {
  const { importo, dataScadenza, dataPagamento } = req.body;
  const risultato = calcolaRavvedimento(importo, new Date(dataScadenza), new Date(dataPagamento));
  res.json({ success: true, data: risultato });
});

// Riepilogo per contribuente
exports.estrattoContribuente = asyncHandler(async (req, res) => {
  const { contribuenteId, annoImposta } = req.query;
  const match = { contribuente: contribuenteId };
  if (annoImposta) match.annoImposta = Number(annoImposta);

  const sommario = await VersamentoIMU.aggregate([
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
