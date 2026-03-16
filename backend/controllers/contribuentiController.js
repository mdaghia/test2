const Contribuente = require('../models/Contribuente');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, stato = 'attivo', tipo } = req.query;
  const query = { stato };
  if (tipo) query.tipo = tipo;
  if (search) query.$text = { $search: search };

  const [data, total] = await Promise.all([
    Contribuente.find(query).sort({ cognome: 1, nome: 1 })
      .skip((page - 1) * limit).limit(Number(limit)),
    Contribuente.countDocuments(query),
  ]);
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const c = await Contribuente.findById(req.params.id);
  if (!c) return res.status(404).json({ success: false, message: 'Contribuente non trovato' });
  res.json({ success: true, data: c });
});

exports.create = asyncHandler(async (req, res) => {
  const c = await Contribuente.create({ ...req.body, creatoDA: req.utente._id });
  res.status(201).json({ success: true, data: c });
});

exports.update = asyncHandler(async (req, res) => {
  const c = await Contribuente.findByIdAndUpdate(
    req.params.id,
    { ...req.body, modificatoDA: req.utente._id },
    { new: true, runValidators: true },
  );
  if (!c) return res.status(404).json({ success: false, message: 'Contribuente non trovato' });
  res.json({ success: true, data: c });
});

exports.annulla = asyncHandler(async (req, res) => {
  const c = await Contribuente.findByIdAndUpdate(
    req.params.id,
    { stato: 'annullato', modificatoDA: req.utente._id },
    { new: true },
  );
  if (!c) return res.status(404).json({ success: false, message: 'Contribuente non trovato' });
  res.json({ success: true, data: c });
});

exports.cerca = asyncHandler(async (req, res) => {
  const { cf, piva, q } = req.query;
  const query = { stato: 'attivo' };
  if (cf)   query.codiceFiscale = cf.toUpperCase();
  if (piva) query.partitaIva = piva;
  if (q)    query.$text = { $search: q };

  const data = await Contribuente.find(query).limit(10);
  res.json({ success: true, data });
});
