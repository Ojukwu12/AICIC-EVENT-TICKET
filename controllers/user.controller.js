const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");


exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json({success:true, noOfUsers: users.length, data: users,
    message: "Operation succesful"
   });
});
