const router = require('express').Router();
const ctrl = require('../controllers/contribuentiController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/cerca', ctrl.cerca);
router.route('/').get(ctrl.list).post(ctrl.create);
router.route('/:id').get(ctrl.getOne).put(ctrl.update);
router.patch('/:id/annulla', ctrl.annulla);

module.exports = router;
