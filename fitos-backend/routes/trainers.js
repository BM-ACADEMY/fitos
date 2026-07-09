const router = require('express').Router();
const auth = require('../middleware/auth');
const { listTrainers, createTrainer, updateTrainer, deleteTrainer, markAttendance, getEarnings } = require('../controllers/trainerController');

router.get('/', auth(['gym_admin']), listTrainers);
router.post('/', auth(['gym_admin']), createTrainer);
router.patch('/:id', auth(['gym_admin']), updateTrainer);
router.delete('/:id', auth(['gym_admin']), deleteTrainer);
router.post('/:id/attendance', auth(['gym_admin']), markAttendance);
router.get('/:id/earnings', auth(['gym_admin', 'trainer']), getEarnings);

module.exports = router;
