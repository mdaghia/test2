const router = require('express').Router();
const ctrl = require('../controllers/dichiarazioniTariController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.patch('/:id/annulla', ctrl.annulla);
router.patch('/:id/stato', ctrl.cambiaStato);
router.post('/:id/calcola', ctrl.calcola);
router.get('/:id/stampa', ctrl.stampa);

module.exports = router;
