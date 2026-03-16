const router = require('express').Router();
const Immobile = require('../models/Immobile');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, contribuente, categoria, comune } = req.query;
  const query = { stato: 'attivo' };
  if (contribuente) query['possessori.contribuente'] = contribuente;
  if (categoria) query.categoriaCatastale = categoria;
  if (comune) query.comune = new RegExp(comune, 'i');
  const [data, total] = await Promise.all([
    Immobile.find(query).populate('possessori.contribuente', 'codiceFiscale cognome nome ragioneSociale')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Immobile.countDocuments(query),
  ]);
  res.json({ success: true, data, total });
}));

router.get('/categorie', (_req, res) => {
  const { CATEGORIE_CATASTALI } = require('../models/Immobile');
  res.json({ success: true, data: CATEGORIE_CATASTALI });
});

router.get('/:id', asyncHandler(async (req, res) => {
  const im = await Immobile.findById(req.params.id).populate('possessori.contribuente');
  if (!im) return res.status(404).json({ success: false, message: 'Immobile non trovato' });
  res.json({ success: true, data: im });
}));

router.post('/', asyncHandler(async (req, res) => {
  const im = await Immobile.create({ ...req.body, creatoDA: req.utente._id });
  res.status(201).json({ success: true, data: im });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const im = await Immobile.findByIdAndUpdate(req.params.id, { ...req.body, modificatoDA: req.utente._id }, { new: true, runValidators: true });
  if (!im) return res.status(404).json({ success: false, message: 'Immobile non trovato' });
  res.json({ success: true, data: im });
}));

router.patch('/:id/annulla', asyncHandler(async (req, res) => {
  const im = await Immobile.findByIdAndUpdate(req.params.id, { stato: 'annullato', modificatoDA: req.utente._id }, { new: true });
  if (!im) return res.status(404).json({ success: false, message: 'Immobile non trovato' });
  res.json({ success: true, data: im });
}));

module.exports = router;
