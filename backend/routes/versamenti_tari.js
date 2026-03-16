const router = require('express').Router();
const ctrl = require('../controllers/versamenti_tariController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/estratto', ctrl.estrattoContribuente);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.patch('/:id/annulla', ctrl.annulla);

module.exports = router;
