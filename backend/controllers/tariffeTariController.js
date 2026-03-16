const TariffaTARI = require('../models/TariffaTARI');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { anno, comune, tipo } = req.query;
  const query = {};
  if (anno)   query.anno = Number(anno);
  if (comune) query.comune = comune;
  if (tipo)   query.tipo = tipo;
  const data = await TariffaTARI.find(query).sort({ anno: -1, tipo: 1, categoria: 1 });
  res.json({ success: true, data });
});

exports.getOne = asyncHandler(async (req, res) => {
  const t = await TariffaTARI.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: 'Tariffa non trovata' });
  res.json({ success: true, data: t });
});

exports.create = asyncHandler(async (req, res) => {
  const t = await TariffaTARI.create({ ...req.body, creatoDA: req.utente._id });
  res.status(201).json({ success: true, data: t });
});

exports.update = asyncHandler(async (req, res) => {
  const t = await TariffaTARI.findByIdAndUpdate(
    req.params.id,
    { ...req.body, modificatoDA: req.utente._id },
    { new: true, runValidators: true },
  );
  if (!t) return res.status(404).json({ success: false, message: 'Tariffa non trovata' });
  res.json({ success: true, data: t });
});

// Copia tariffe anno precedente
exports.copiaAnno = asyncHandler(async (req, res) => {
  const { annoOrigine, annoDestino, comune } = req.body;
  const tariffe = await TariffaTARI.find({ anno: annoOrigine, comune });
  if (!tariffe.length) return res.status(404).json({ success: false, message: 'Nessuna tariffa trovata per l\'anno di origine' });
  const nuove = await TariffaTARI.insertMany(
    tariffe.map(t => ({ ...t.toObject(), _id: undefined, anno: annoDestino, creatoDA: req.utente._id, createdAt: undefined, updatedAt: undefined })),
    { ordered: false }
  );
  res.status(201).json({ success: true, data: nuove, count: nuove.length });
});
