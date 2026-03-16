const { Router } = require('express');
const ctrl = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

const r = Router();
r.use(authenticate);

r.get('/sessioni',              ctrl.listSessions);
r.post('/sessioni',             ctrl.createSession);
r.get('/sessioni/:id',          ctrl.getSession);
r.patch('/sessioni/:id/archivia', ctrl.archiveSession);
r.post('/messaggio',            ctrl.sendMessage);     // SSE streaming

module.exports = r;
