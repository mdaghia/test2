const router = require('express').Router();
const AliquotaIMU = require('../models/AliquotaIMU');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const { anno, comune } = req.query;
  const query = {};
  if (anno) query.anno = Number(anno);
  if (comune) query.comune = comune;
  const data = await AliquotaIMU.find(query).sort({ anno: -1, tipoImmobile: 1 });
  res.json({ success: true, data });
}));

router.post('/', authorize('supervisore', 'admin'), asyncHandler(async (req, res) => {
  const al = await AliquotaIMU.create({ ...req.body, creatoDA: req.utente._id });
  res.status(201).json({ success: true, data: al });
}));

router.put('/:id', authorize('supervisore', 'admin'), asyncHandler(async (req, res) => {
  const al = await AliquotaIMU.findByIdAndUpdate(req.params.id, { ...req.body, modificatoDA: req.utente._id }, { new: true, runValidators: true });
  if (!al) return res.status(404).json({ success: false, message: 'Aliquota non trovata' });
  res.json({ success: true, data: al });
}));

// Copia aliquote anno precedente
router.post('/copia-anno', authorize('supervisore', 'admin'), asyncHandler(async (req, res) => {
  const { annoOrigine, annoDestino, comune } = req.body;
  const aliquote = await AliquotaIMU.find({ anno: annoOrigine, comune });
  const nuove = await AliquotaIMU.insertMany(
    aliquote.map(a => ({ ...a.toObject(), _id: undefined, anno: annoDestino, creatoDA: req.utente._id })),
    { ordered: false }
  );
  res.status(201).json({ success: true, data: nuove, count: nuove.length });
}));

module.exports = router;
