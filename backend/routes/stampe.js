const router = require('express').Router();
const { protect } = require('../middleware/auth');
const elaborazioniCtrl = require('../controllers/elaborazioniController');

router.use(protect);

// Stampa massiva (via Kafka)
router.post('/massiva', elaborazioniCtrl.avviaStampaMassiva);

// Le stampe singole sono sui rispettivi router
// GET /api/v1/dichiarazioni/:id/stampa
// GET /api/v1/atti/:id/stampa

module.exports = router;
