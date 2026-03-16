const router = require('express').Router();
const ctrl = require('../controllers/elaborazioniController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/calcolo-massivo', authorize('supervisore', 'admin'), ctrl.avviaCalcoloMassivo);
router.post('/stampa-massiva', ctrl.avviaStampaMassiva);
router.patch('/:id/annulla', ctrl.annullaElaborazione);
router.get('/:id/output', ctrl.scaricaOutput);

module.exports = router;
