const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { sendMail } = require("../utils/sendMail");
const crypto = require("crypto");

exports.signup = asyncHandler(async (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().required(),
    role: Joi.string().valid("attendee", "organizer").required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  if (value.password != value.confirmPassword) {
    return next(new AppError("Passwords do not match", 400));
  }
  const user = await User.create(value);
  try {
    await sendMail(
      "everybody",
      "signup",
      { "user.name": user.name },
      user.email,
      "Successful Signup",
      next
    );
  } catch (error) {
    console.error("Error sending signup email:", error);
  }

  return generateToken(res, user._id);
});

exports.login = asyncHandler(async (req, res, next) => {
  // ✅ Add debug logging
  console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
  console.log(
    "JWT_REFRESH_SECRET exists:",
    !!process.env.JWT_REFRESH_SECRET
  );

  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  const foundUser = await User.findOne({ email: value.email }).select(
    "+password"
  );

  if (
    !foundUser ||
    !(await foundUser.comparePassword(
      value.password,
      foundUser.password
    ))
  ) {
    return next(new AppError("Invalid credentials", 401));
  }

  return generateToken(res, foundUser._id);
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  const user = await User.findOne({ email: value.email });
  if (!user) {
    return next(
      new AppError("There is no user with this email address", 404)
    );
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/resetPassword/${resetToken}`;

  try {
    await sendMail(
      "everybody",
      "forgotPassword",
      { "user.name": user.name, resetUrl: resetURL },
      user.email,
      "Forgot Password",
      next
    );
    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (error) {
    console.error("Error details:", error);
    // Reset the token and expiration date on the user object
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("Invalid or expired token", 400));
  }
  const schema = Joi.object({
    password: Joi.string().required(),
    confirmPassword: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  if (value.password !== value.confirmPassword) {
    return next(new AppError("Passwords do not match", 400));
  }
  user.password = value.password;
  user.confirmPassword = value.confirmPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  try {
    await sendMail(
      "everybody",
      "resetPassword",
      { "user.name": user.name },
      user.email,
      "Password Reset Successful",
      next
    );
  } catch (error) {
    console.error("Error sending reset password email:", error);
  }
  return generateToken(res, user._id);
});

exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken)
    return next(
      new AppError("No Token Found. Please login again", 401)
    );

  const decoded = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET
  );
  if (!decoded)
    return next(new AppError("Invalid refresh token", 403));

  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError("User not found", 404));

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "15min",
  });

  return res.status(200).json({
    token,
  });
});

exports.getMyProfile = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return next(
      new AppError("No token found. Please login again", 401)
    );
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded) {
    return next(new AppError("Invalid token", 403));
  }
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});
exports.logout = asyncHandler(async (req, res, next) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

function generateToken(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "15min",
  });
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "30d",
    }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };

  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json({ token });
}
