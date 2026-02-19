const User = require('../models/User');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { fullName, email, phoneNumber, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      role: role || 'user',
      status: 'Active'
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        token: generateToken(user._id, user.role)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Select password + 2FA fields (some have select:false)
    const user = await User.findOne({ email }).select('+password +twoFactorEnabled +twoFactorSecret +phoneNumber +status');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log(`>>> Login attempt for ${user.email}. Status: ${user.status}, Role: ${user.role}`);

    // Check account status
    if (user.status !== 'Active' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Your account is not active. Contact admin.' });
    }

    // If user is ADMIN — Skip 2FA and issue JWT immediately
    if (user.role.toLowerCase() === 'admin') {
      console.log(`>>> Admin login: Bypassing 2FA for ${user.email}`);
      return res.json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        token: generateToken(user._id, user.role)
      });
    }

    // IF 2FA IS NOT ENABLED — Force setup immediately
    if (!user.twoFactorEnabled) {
      console.log(`>>> Forcing 2FA setup for user: ${user.email}`);
      const secret = speakeasy.generateSecret({
        name: `CareerHub (${user.email})`,
        length: 20
      });

      // Save secret temporarily
      user.twoFactorSecret = secret.base32;
      await user.save();

      // Generate QR code
      const qrCodeImage = await QRCode.toDataURL(secret.otpauth_url);

      return res.status(200).json({
        requiresSetup: true,
        userId: user._id,
        qrCodeImage,
        base32Secret: secret.base32
      });
    }

    // IF 2FA IS ENABLED — Ask for OTP
    if (user.twoFactorEnabled) {
      const maskedPhone = user.phoneNumber 
        ? `${user.phoneNumber.substring(0, 3)}****${user.phoneNumber.slice(-3)}`
        : null;

      return res.status(200).json({
        requires2FA: true,
        userId: user._id,
        availableMethods: user.phoneNumber ? ['authenticator', 'whatsapp'] : ['authenticator'],
        phoneNumber: maskedPhone
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

module.exports = { register, login };
