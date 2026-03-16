const router = require('express').Router();
const ctrl = require('../controllers/utenzeTariController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/per-contribuente', ctrl.perContribuente);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.patch('/:id/annulla', ctrl.annulla);
router.patch('/:id/stato', ctrl.cambiaStato);

module.exports = router;
