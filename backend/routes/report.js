const { Router } = require('express');
const ctrl = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

const r = Router();
r.use(authenticate);

r.get('/riepilogo',          ctrl.riepilogo);
r.get('/versamenti-mensili', ctrl.versamentiMensili);
r.get('/estratto-conto',     ctrl.estrattoConto);
r.get('/libro-ruoli',        ctrl.libroRuoli);
r.get('/export',             ctrl.exportDati);

module.exports = r;
