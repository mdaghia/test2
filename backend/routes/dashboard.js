const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/summary', ctrl.summary);
router.get('/andamento-versamenti', ctrl.andamentoVersamenti);

module.exports = router;
