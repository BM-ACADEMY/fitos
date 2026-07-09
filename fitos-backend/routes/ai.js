const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/planGate');
const { createWorkoutPlan, createDietPlan, sendPlan, getPlans } = require('../controllers/aiController');

router.post('/workout-plan', auth(['gym_admin', 'trainer']), requireFeature('ai_workout'), createWorkoutPlan);
router.post('/diet-plan', auth(['gym_admin', 'trainer']), requireFeature('ai_diet'), createDietPlan);
router.post('/send-plan', auth(['gym_admin', 'trainer']), sendPlan);
router.get('/plans/:memberId', auth(['gym_admin', 'trainer']), getPlans);

module.exports = router;
