const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { enable2FA, verify2FASetup, verify2FALogin, verify2FASetupLogin } = require('../controllers/twoFactorController');
const { sendWhatsAppOTP, verifyWhatsAppOTP } = require('../controllers/whatsappController');
const { protect } = require('../middleware/authMiddleware');

// Public auth routes
router.post('/register', register);
router.post('/login', login);

// 2FA login verification (public — no JWT yet at this point)
router.post('/verify-2fa-login', verify2FALogin);
router.post('/verify-2fa-setup-login', verify2FASetupLogin);

// WhatsApp OTP Routes
router.post('/send-whatsapp-otp', sendWhatsAppOTP);
router.post('/verify-whatsapp-otp', verifyWhatsAppOTP);

// 2FA setup routes (protected — user must be logged in)
router.post('/enable-2fa', protect, enable2FA);
router.post('/verify-2fa-setup', protect, verify2FASetup);

module.exports = router;
