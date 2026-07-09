const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/planGate');
const { createPackage, listPackages, listMemberPackages, bookSession, listSessions, completeSession } = require('../controllers/ptController');

router.post('/packages', auth(['gym_admin', 'trainer']), requireFeature('pt_sessions'), createPackage);
router.get('/packages', auth(['gym_admin', 'trainer']), listPackages);
router.get('/packages/:memberId', auth(['gym_admin', 'trainer']), listMemberPackages);
router.post('/sessions', auth(['gym_admin', 'trainer']), bookSession);
router.get('/sessions', auth(['gym_admin', 'trainer']), listSessions);
router.patch('/sessions/:id/complete', auth(['gym_admin', 'trainer']), completeSession);

module.exports = router;
