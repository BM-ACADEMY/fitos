const router = require('express').Router();
const auth = require('../middleware/auth');
const { checkMemberLimit } = require('../middleware/planGate');
const { listMembers, createMember, getMember, updateMember, deleteMember } = require('../controllers/memberController');

router.get('/', auth(['gym_admin', 'trainer']), listMembers);
router.post('/', auth(['gym_admin', 'trainer']), checkMemberLimit, createMember);
router.get('/:id', auth(['gym_admin', 'trainer']), getMember);
router.patch('/:id', auth(['gym_admin', 'trainer']), updateMember);
router.delete('/:id', auth(['gym_admin']), deleteMember);

module.exports = router;
