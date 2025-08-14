const AppError = require("../utils/appError");
const asyncHandler = require("../utils/asyncHandler")
const joi = require("joi")
const mongoose = require("mongoose")
const User = require("../models/user.model")
const Event = require("../models/events.model");
const { sendMail } = require("../utils/sendMail");

exports.postEvent = asyncHandler(async (req, res, next) =>{
       const schema = joi.object({
           title: joi.string().required(),
           description: joi.string().required(),
           category: joi.string().valid("workshop", "seminar", "conference", "meetup", "party", "other").required(),
           date: joi.date().required(),
           location: joi.string().required(),
           time: joi.string().required(),
           status: joi.string().valid("draft", "published", "cancelled").default("draft"),
           totalTickets: joi.number().min(1).required(),
           availableTickets: joi.number().min(0).required(),
           media: joi.string().default(""),
           organizer: joi.string().required(),
           price: joi.number().min(0)
       })

       const {value, error} = schema.validate(req.body)
       if (error) {
        return next(new AppError(error.details[0].message, 400))
       }
       if(req.user._id.toString() !== value.organizer){
           return next(new AppError("You are not authorized to create this event", 403))
        }
       value.userId = req.user._id
      
       const event = await Event.create(value)
       
       const eventId = event._id
       const baseUrl = process.env.BASE_URL
       const editLink = `${baseUrl}/api/v1/events/${eventId}`
       try{
        await sendMail("Organizer", "eventPosted", {
            "user.name": req.user.name,
            "event.name": event.title,
            "event.date": event.date,
            "editLink": editLink
        }, req.user.email, "Event Successfully Posted", next);
       }catch(error){
        console.error("Error sending event posted email:", error);
        return next(new AppError("Failed to send event posted email", 500));
       }
       res.status(201).json({
           Success: "true",
           data: {
               event
           }
       })
})

exports.getAllEvents = asyncHandler(async (req, res, next) => {
 const filter = {
  status: "published",
 };
 if (req.query.category) {
   filter.category = req.query.category;
 }
 if (req.query.minDate || req.query.maxDate) {
   filter.date = {};
   if (req.query.minDate) {
     filter.date.$gte = new Date(req.query.minDate);
   }
   if (req.query.maxDate) {
     filter.date.$lte = new Date(req.query.maxDate);
   }
 }
 if (req.query.location) {
  filter.location = { $regex: req.query.location, $options: "i" };
 }
 if(req.query.search){
  filter.$or = [
   { title: { $regex: req.query.search, $options: "i" } },
   { description: { $regex: req.query.search, $options: "i" } },
  ];
 }
if (req.query.minPrice || req.query.maxPrice){
 filter['price'] = {};
 if (req.query.minPrice) {
   filter['price'].$gte = parseFloat(req.query.minPrice);
 }
 if (req.query.maxPrice) {
   filter['price'].$lte = parseFloat(req.query.maxPrice);
 }
}

const page = parseInt(req.query.page) || 1
const limit = parseInt(req.query.limit) || 10
const skip = (page - 1) * limit
const sort = req.query.sort || "date"

const total = await Event.countDocuments(filter)
const event = await Event.find(filter).sort(sort).skip(skip).limit(limit)
if (event.length === 0) {
   return next(new AppError("No events found", 404));
 }
res.status(200).json({
 Success: true,
 total,
 page,
 pages: Math.ceil(total/limit),
 Data: event
})
})

exports.eventBySearch = asyncHandler(async (req,res,next) => {
  const filter = {
    status: "published",
  };
  if (req.params.search) {
    filter.$or = [
      { title: { $regex: req.params.search, $options: "i" } },
      { description: { $regex: req.params.search, $options: "i" } },
    ];
  }
  else {
   return next(new AppError("Search query is required",400))
  }
  const event = await Event.find(filter);
   res.status(200).json({
     Message: "Success",
     length: event.length,
     Data: event,
   });
})

exports.eventByCategory = asyncHandler(async(req,res,next)=>{
       const validCategories = ["workshop", "seminar", "conference", "meetup", "party", "other"];
       const filter = {
         status: "published",
       };
       if (req.params.category) {
         if (!validCategories.includes(req.params.category)) {
           return next(new AppError("Invalid category. Valid categories are: " + validCategories.join(", "), 400))
         }
         filter.category = req.params.category;
       }
       else {
         return next(new AppError("Category parameter is required", 400));
       }
    const event = await Event.find(filter);
    if (event.length === 0) {
      return next(new AppError("No events found for this category", 404));
    }
    res.status(200).json({
     Message: "Success",
     length: event.length,
     Data: event
    })
})

exports.getEventById = asyncHandler(async (req, res, next) => {
 const id = req.params.id;
 
 if (!mongoose.Types.ObjectId.isValid(id)) {
   return next(new AppError("Invalid event ID format", 400));
 }
 
 const event = await Event.findOne({ _id: id }).populate("organizer","name email role");
 if (!event) {
   return next(new AppError("Event not found", 404));
 }
 res.status(200).json({
   Message: "Success",
   Data: event
 });
})

exports.deleteEvent = asyncHandler(async (req, res, next) => {
 const id = req.params.id;

 // Validate ObjectId format
 if (!mongoose.Types.ObjectId.isValid(id)) {
   return next(new AppError("Invalid event ID format", 400));
 }

 const event = await Event.findByIdAndDelete(id);
 if (!event) {
   return next(new AppError("Event not found", 404));
 }

 res.status(200).json({
   status: "success",
   message: "Event deleted successfully",
 });
})

exports.updateEvent = asyncHandler(async (req, res, next) => {

 const id = req.params.id;
 if (!mongoose.Types.ObjectId.isValid(id)) {
   return next(new AppError("Invalid event ID format", 400));
 }
 const schema = joi.object({
   title: joi.string(),
   description: joi.string(),
   category: joi.string().valid("workshop", "seminar", "conference", "meetup", "party", "other"),
   date: joi.date(),
   location: joi.string(),
   time: joi.string(),
   status: joi.string().valid("draft", "published", "cancelled"),
   totalTickets: joi.number().min(1),
   availableTickets: joi.number().min(0),
   media: joi.string(),
   price: joi.number().min(0)
 });
 const { value, error } = schema.validate(req.body);
 if (error) { 
   return next(new AppError(error.details[0].message, 400));
 }
 const event = await Event.findByIdAndUpdate(id,value,{new: true});
 if (!event) {
   return next(new AppError("Event not found", 404));
 }
 if (req.user._id.toString() !== event.organizer.toString()) {
   return next(new AppError("You are not authorized to update this event", 403));
 }
 res.status(200).json({
   status: "success",
   Message: "Event updated successfully",
   data: {
     event
   }
 });

})

exports.getEventByOrganizer = asyncHandler(async (req, res, next) => {
 const organizerId = req.user._id;
 if (!mongoose.Types.ObjectId.isValid(organizerId)) {
   return next(new AppError("Invalid organizer ID format", 400));
 }
 const event = await Event.find({ organizer: organizerId});
 if(!event || event.length === 0) {
   return next(new AppError("No events found for this organizer", 404));
  }
  res.status(200).json({
   status: success,
   Message: "Events retrieved successfully",
   data: {
     event
   } 
  })
})

exports.toggleEventStatus = asyncHandler(async (req, res, next) => {
 const id = req.params.id;
 if (!mongoose.Types.ObjectId.isValid(id)) {
   return next(new AppError("Invalid event ID format", 400));
 }
 const event = await Event.findById(id);
 if (!event) {
   return next(new AppError("Event not found", 404));
 }
 if (req.user._id.toString() !== event.organizer.toString()) {
   return next(new AppError("You are not authorized to change the status of this event", 403));
 }
 if (event.status === "published") {
   event.status = "draft";
 } else if (event.status === "draft") {
   event.status = "published";
 } else {
   return next(new AppError("Cannot toggle status for cancelled events", 400));
 }
 await event.save();
 res.status(200).json({
   status: "success",
   message: `Event status changed to ${event.status}`,
   data: {
     event
   }
 });
});