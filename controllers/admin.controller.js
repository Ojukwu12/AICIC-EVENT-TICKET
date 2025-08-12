const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const Event = require('../models/events.model');
const User = require('../models/user.model');
const joi = require('joi')
const sendMail = require('../utils/sendMail')
const mongoose = require('mongoose'); 


exports.eventApproval = asyncHandler(async (req, res, next)=>{
 const adminEmail = req.user.email;
 const schema = joi.object({
   status: joi.string().valid("approved", "rejected", "pending").required()
 });
 const { value, error } = schema.validate(req.body);
 if (error) {
   return next(new AppError(error.details[0].message, 400));
 }
 const { status } = value;
 const eventId = req.params.eventId
 const event = await Event.findById(eventId)
 const user = await User.findById(event.organizer)
 if (!event) {
   return next(new AppError("Event not found", 404));
 }
 event.approval = status;
 await event.save();
 if (status === "approved") {
   // Send email to user
   try {
    await sendMail("Organizer", "eventAccepted", {
      "user.name": user.name,
      "event.name": event.name,
      "event.date": event.date,
      "admin.email": adminEmail
    }, user.email, "Event Approved", next);
   }catch(error){
     console.error("Error sending approval email:", error);
     return next(new AppError("Failed to send approval email", 500));
   }
 } else if (status === "rejected") {
   // Send email to user
   try {
     await sendMail("Organizer", "eventRejected", {
       "user.name": user.name,
       "event.name": event.name,
       "event.date": event.date,
       "admin.email": adminEmail
     }, user.email, "Event Rejected", next);
   } catch (error) {
     console.error("Error sending rejection email:", error);
     return next(new AppError("Failed to send rejection email", 500));
   }
 }

 res.status(200).json({
  success: true,
  data: {
    event
  }
})});


