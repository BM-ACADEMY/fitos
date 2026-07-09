const router = require('express').Router();
const { sendOtp, verifyOtp, registerGym } = require('../controllers/authController');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register-gym', registerGym);

module.exports = router;
