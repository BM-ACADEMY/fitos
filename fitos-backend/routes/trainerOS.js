const router = require('express').Router();
const auth = require('../middleware/auth');
const { createMeasurement, getMeasurements, saveWorkout, getMyMembers } = require('../controllers/trainerOSController');

router.post('/measurements', auth(['gym_admin', 'trainer']), createMeasurement);
router.get('/measurements/:memberId', auth(['gym_admin', 'trainer']), getMeasurements);
router.post('/workout', auth(['gym_admin', 'trainer']), saveWorkout);
router.get('/my-members', auth(['trainer']), getMyMembers);

module.exports = router;
