const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// ─── Helper ────────────────────────────────────────────────────────────────────
const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });

// @desc    Generate a TOTP secret and return QR code for the logged-in user
// @route   POST /api/auth/enable-2fa
// @access  Private (JWT required)
const enable2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `CareerHub (${req.user.email})`,
      length: 20
    });

    // Temporarily save the secret (not yet "enabled") so verify-setup can read it
    await User.findByIdAndUpdate(req.user._id, {
      twoFactorSecret: secret.base32
    });

    // Generate QR code as a data-URL image
    const qrCodeImage = await QRCode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      success: true,
      qrCodeImage,
      base32Secret: secret.base32
    });
  } catch (error) {
    console.error('enable2FA error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate 2FA secret' });
  }
};

// @desc    Verify the OTP from the authenticator app and permanently enable 2FA
// @route   POST /api/auth/verify-2fa-setup
// @access  Private (JWT required)
const verify2FASetup = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'OTP token is required' });
    }

    // Fetch user WITH the secret field
    const user = await User.findById(req.user._id).select('+twoFactorSecret');

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'No 2FA secret found. Please call enable-2fa first.'
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token.toString().trim(),
      window: 1 // allow ±30 seconds drift
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // Permanently enable 2FA
    await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true });

    res.status(200).json({
      success: true,
      message: '2FA has been enabled successfully!'
    });
  } catch (error) {
    console.error('verify2FASetup error:', error);
    res.status(500).json({ success: false, message: 'Server error during 2FA setup verification' });
  }
};

// @desc    Verify OTP at login and return JWT if valid
// @route   POST /api/auth/verify-2fa-login
// @access  Public
const verify2FALogin = async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ success: false, message: 'userId and token are required' });
    }

    const user = await User.findById(userId).select('+twoFactorSecret');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA is not enabled for this user' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token.toString().trim(),
      window: 1
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // OTP valid — issue JWT
    res.status(200).json({
      success: true,
      token: generateToken(user._id, user.role),
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('verify2FALogin error:', error);
    res.status(500).json({ success: false, message: 'Server error during 2FA login verification' });
  }
};

// @desc    Verify OTP for FIRST TIME setup at login and enable 2FA
// @route   POST /api/auth/verify-2fa-setup-login
// @access  Public
const verify2FASetupLogin = async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ success: false, message: 'userId and token are required' });
    }

    const user = await User.findById(userId).select('+twoFactorSecret');

    if (!user || !user.twoFactorSecret) {
      return res.status(404).json({ success: false, message: 'User or secret not found' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token.toString().trim(),
      window: 1
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // OTP valid — enable 2FA permanently
    user.twoFactorEnabled = true;
    await user.save();

    // Issue JWT
    res.status(200).json({
      success: true,
      token: generateToken(user._id, user.role),
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('verify2FASetupLogin error:', error);
    res.status(500).json({ success: false, message: 'Server error during 2FA setup verification' });
  }
};

module.exports = { enable2FA, verify2FASetup, verify2FALogin, verify2FASetupLogin };
