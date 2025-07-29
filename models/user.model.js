const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
  },
  password: {
   type: String,
   required: [true, 'Please provide a password'],
   minlength: 8,
   maxlength: 20,
   select: false,
  },
  role: {
   type: String,
   enum: ['user', 'admin'],
   default: 'user',
  },
  passwordUpdatedAt: Date,

  OTP: {
   type: Number,
  },
  otpExpiresAt: {
   type: Date
  },
  paymentStatus: {
   type: Boolean,
   default: false
  }
 })

userSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified('password')) {
    this.passwordUpdatedAt = Date.now();
  }
  next();
});


userSchema.methods.comparePassword = async function (
  candidatePassword,
  hashedDBPassword
) {
  return await bcrypt.compare(candidatePassword, hashedDBPassword);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
