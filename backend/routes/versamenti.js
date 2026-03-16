const router = require('express').Router();
const ctrl = require('../controllers/versamentiController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/estratto', ctrl.estrattoContribuente);
router.post('/ravvedimento', ctrl.calcolaRavvedimento);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.patch('/:id/annulla', ctrl.annulla);

module.exports = router;
