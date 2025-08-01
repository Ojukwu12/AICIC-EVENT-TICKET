const AppError = require("../utils/appError");

exports.eventAccess = (req,res,next) =>{
 if(req.user.role !== 'admin' && req.user.role !== 'organizer') {
   return next(new AppError("You do not have permission to perform this action", 403));
 }

 next()
}

