const AppError = require("../utils/appError")
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");

exports.protectRoute = asyncHandler(async (req, res, next) => {
 if (!(req.headers.authorization) || !(req.headers.authorization.startsWith("Bearer "))) {
   return next(
     new AppError("You are not logged in! Please log in to get access.", 401)
   );
 }
 const token = req.headers.authorization.split(" ")[1];

 const decoded = jwt.verify(token, process.env.JWT_SECRET);
 const currentUser = await User.findById(decoded.id);
 if (!currentUser) {
   return next(new AppError("The user belonging to this token no longer exists", 401));
 }
 if (User.passwordUpdatedAt > new Date(decoded.iat * 1000)){
  return new AppError("This password was recently changed, Please log in again", 400)
 } 
 req.user = currentUser;
 next(); 
}) 
