const { Router } = require('express');
const ctrl = require('../controllers/syncController');
const { authenticate } = require('../middleware/auth');

const r = Router();

// Service-to-service endpoints (x-sync-key auth)
r.post('/contribuenti', ctrl.authSyncKey, ctrl.syncContribuenti);
r.post('/immobili',     ctrl.authSyncKey, ctrl.syncImmobili);

// UI/frontend endpoints (JWT auth)
r.get('/log',    authenticate, ctrl.listLog);
r.get('/status', authenticate, ctrl.syncStatus);

module.exports = r;
