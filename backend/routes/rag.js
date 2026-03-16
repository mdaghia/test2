const { Router } = require('express');
const ctrl = require('../controllers/ragController');
const { authenticate, authorize } = require('../middleware/auth');

const r = Router();
r.use(authenticate);

r.get('/',          ctrl.list);
r.get('/:id',       ctrl.getOne);
r.post('/upload',   authorize('supervisore', 'admin'), ctrl.upload);
r.delete('/:id',    authorize('supervisore', 'admin'), ctrl.remove);

module.exports = r;
