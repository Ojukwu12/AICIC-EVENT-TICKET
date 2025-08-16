const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide your name"],
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    maxlength: 20,
    select: false,
  },
  role: {
    type: String,
    enum: ["attendee", "admin", "organizer"],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  passwordUpdatedAt: Date,
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
});

userSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified("password")) {
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

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
