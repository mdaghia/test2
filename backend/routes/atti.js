const router = require('express').Router();
const ctrl = require('../controllers/attiController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/emissione-massiva', authorize('supervisore', 'admin'), ctrl.emissioneMassiva);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.patch('/:id/annulla', ctrl.annulla);
router.patch('/:id/stato', ctrl.cambiaStato);
router.get('/:id/stampa', ctrl.stampa);

module.exports = router;
