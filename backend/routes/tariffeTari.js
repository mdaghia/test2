const router = require('express').Router();
const ctrl = require('../controllers/tariffeTariController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('supervisore', 'admin'), ctrl.create);
router.put('/:id', authorize('supervisore', 'admin'), ctrl.update);
router.post('/azioni/copia-anno', authorize('supervisore', 'admin'), ctrl.copiaAnno);

module.exports = router;
