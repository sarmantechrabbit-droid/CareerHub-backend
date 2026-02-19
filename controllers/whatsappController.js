const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');

// Twilio Config (To be stored in .env)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+14155238886'

let client;
if (accountSid && authToken) {
  console.log('>>> Initializing Twilio client with AccountSid:', accountSid);
  client = twilio(accountSid, authToken);
} else {
  console.warn('>>> Twilio credentials missing in .env. WhatsApp OTP will not be sent.');
}

// Generate JWT Helper
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Send OTP via WhatsApp
// @route   POST /api/auth/send-whatsapp-otp
// @access  Public
const sendWhatsAppOTP = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId).select('+phoneNumber +otpCode +otpExpires +otpAttempts');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.phoneNumber) {
      return res.status(400).json({ message: 'WhatsApp number not registered for this user' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // Save to user
    user.otpCode = otpHash;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.otpAttempts = 0;
    await user.save();

    console.log(`>>> Generated OTP for ${user.email}: ${otp}`);

    // Send via Twilio
    if (client) {
      try {
        // Simple formatting to ensure it has the international format (+91 for India if 10 digits)
        let formattedNumber = user.phoneNumber;
        if (!formattedNumber.startsWith('+')) {
          if (formattedNumber.length === 10) {
            formattedNumber = `+91${formattedNumber}`;
          } else if (formattedNumber.length > 10) {
            formattedNumber = `+${formattedNumber}`;
          }
        }

        const twilioTo = `whatsapp:${formattedNumber}`;
        console.log(`>>> Attempting to send WhatsApp message from: ${whatsappNumber} to: ${twilioTo}`);

        await client.messages.create({
          body: `Your CareerHub verification code is: ${otp}. It expires in 5 minutes.`,
          from: whatsappNumber,
          to: twilioTo
        });
        console.log(`>>> WhatsApp OTP sent successfully to ${twilioTo}`);
      } catch (twilioErr) {
        console.error('Twilio Error:', twilioErr);
        // In development, we might still want to proceed if Twilio fails but we logged the OTP
        if (process.env.NODE_ENV !== 'production') {
           return res.status(200).json({ 
             message: 'OTP generated (Twilio failed, check console in dev)',
             devOtp: otp // Only for debugging
           });
        }
        return res.status(500).json({ message: 'Failed to send WhatsApp message' });
      }
    } else {
      console.warn('>>> Twilio client not initialized. Check your .env file.');
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({ 
          message: 'OTP generated (Twilio not configured)',
          devOtp: otp 
        });
      }
      return res.status(500).json({ message: 'WhatsApp service not configured' });
    }

    res.status(200).json({ message: 'OTP sent successfully to WhatsApp' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify WhatsApp OTP
// @route   POST /api/auth/verify-whatsapp-otp
// @access  Public
const verifyWhatsAppOTP = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId).select('+password +otpCode +otpExpires +otpAttempts');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Security checks
    if (!user.otpCode || !user.otpExpires) {
      return res.status(400).json({ message: 'No OTP requested' });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (user.otpAttempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(otp, user.otpCode);

    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }   

    // Success - Clear OTP fields
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      token: generateToken(user._id, user.role)
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendWhatsAppOTP,
  verifyWhatsAppOTP
};
