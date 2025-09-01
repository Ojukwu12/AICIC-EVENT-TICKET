const AppError = require("../utils/appError");
const asyncHandler = require("../utils/asyncHandler");
const Event = require("../models/events.model");
const User = require("../models/user.model");
const Booking = require("../models/tickets.model");
const joi = require("joi");
const {sendMail} = require("../utils/sendMail");
const mongoose = require("mongoose");

exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const filter = {};
  if (req.query) {
    if (req.query.name) {
      filter.name = { $regex: req.query.name, $options: "i" };
    }
    if (req.query.email) {
      filter.email = { $regex: req.query.email, $options: "i" };
    }
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query._id) {
      filter._id = req.query._id;
    }
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = req.query.sort || "date";

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);
  res.status(200).json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: users,
    message: "Operation successful",
  });
});

exports.eventApproval = asyncHandler(async (req, res, next) => {
  console.log("Event approval called");
  const adminEmail = req.user.email;
  const schema = joi.object({
    approval: joi
      .string()
      .valid("approved", "rejected", "pending")
      .required(),
  });
  const { value, error } = schema.validate(req.body);
  if (error || !value) {
    return next(
      new AppError(
        error?.details[0].message || "Invalid request",
        400
      )
    );
  }
  const { approval } = value;
  const eventId = req.params.id;
  const event = await Event.findById(eventId);
  console.log("Event found:", event);
  const user = await User.findById(event.organizer);
  if (!event) {
    return next(new AppError("Event not found", 404));
  }
  if (event.status !== "draft") {
    return next(new AppError("Event is not in draft status", 400));
  }
  event.approval = approval;
  if (event.approval.toString() === "approved") {
    event.status = "published";
    try {
      await sendMail(
        "Organizer",
        "eventAccepted",
        {
          "user.name": user.name,
          "event.name": event.title,
          "event.date": event.date,
          "admin.email": adminEmail,
        },
        user.email,
        "Event Approved",
        next
      );
    } catch (error) {
      console.error("Error sending approval email:", error);
      return next(new AppError("Failed to send approval email", 500));
    }
  } else if (event.approval.toString() === "rejected") {
    // Send email to user
    try {
      await sendMail(
        "Organizer",
        "eventRejected",
        {
          "user.name": user.name,
          "event.name": event.title,
          "event.date": event.date,
          "admin.email": adminEmail,
        },
        user.email,
        "Event Rejected",
        next
      );
    } catch (error) {
      console.error("Error sending rejection email:", error);
      return next(
        new AppError("Failed to send rejection email", 500)
      );
    }
  }

  await event.save();

  res.status(200).json({
    success: true,
    data: {
      event,
    },
    message: "Operation successful",
  });
});

exports.updateUserDetails = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const schema = joi.object({
    name: joi.string().min(2).max(100),
    email: joi.string().email(),
    role: joi.string().valid("attendee", "admin", "organizer"),
    status: joi.string().valid("active", "inactive"),
  });
  const { value, error } = schema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  const user = await User.findByIdAndUpdate(userId, value, {
    new: true,
  });
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  if (user.status === "inactive") {
    try {
      await sendMail(
        "everybody",
        "accountStatus",
        { "user.name": user.name },
        user.email,
        "Account Status Update",
        next
      );
    } catch (error) {
      console.error("Error sending account status email:", error);
      return next(
        new AppError("Failed to send account status email", 500)
      );
    }
  } else {
    try {
      await sendMail(
        "everybody",
        "accountDetailsUpdate",
        { "user.name": user.name },
        user.email,
        "Account Status Update",
        next
      );
    } catch (error) {
      console.error("Error sending account status email:", error);
      return next(
        new AppError("Failed to send account status email", 500)
      );
    }
  }
  res.status(200).json({
    success: true,
    data: {
      user,
    },
    message: "Operation successful",
  });
});

exports.getEvents = asyncHandler(async (req, res, next) => {
  const filter = {};
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
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { description: { $regex: req.query.search, $options: "i" } },
    ];
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.approval) {
    filter.approval = req.query.approval;
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filter["price"] = {};
    if (req.query.minPrice) {
      filter["price"].$gte = parseFloat(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      filter["price"].$lte = parseFloat(req.query.maxPrice);
    }
  }
  if (req.query.availableTickets) {
    filter.availableTickets = parseInt(req.query.availableTickets);
  }
  if (req.query.totalTickets) {
    filter.totalTickets = parseInt(req.query.totalTickets);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = req.query.sort || "date";
  const total = await Event.countDocuments(filter);
  const event = await Event.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);
  if (event.length === 0) {
    return next(new AppError("No events found", 404));
  }
  res.status(200).json({
    Success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    Data: event,
    message: "Operation successful",
  });
});

exports.getBookings = asyncHandler(async (req, res, next) => {
  const filter = {};
  if (req.query.eventId) {
    filter.event = req.query.eventId;
  }
  if (req.query.attendeeId) {
    filter.attendee = req.query.attendeeId;
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filter["totalprice"] = {};
    if (req.query.minPrice) {
      filter["totalprice"].$gte = parseFloat(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      filter["totalprice"].$lte = parseFloat(req.query.maxPrice);
    }
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.search) {
    filter.$or = [
      {
        "attendee.name": { $regex: req.query.search, $options: "i" },
      },
      { "event.title": { $regex: req.query.search, $options: "i" } },
    ];
  }
  if (req.query.quantity) {
    filter.quantity = parseInt(req.query.quantity);
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sort = req.query.sort || "date";
  const total = await Booking.countDocuments(filter);
  const booking = await Booking.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);
  if (booking.length === 0) {
    return next(new AppError("No bookings found", 404));
  }
  res.status(200).json({
    Success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    Data: booking,
    message: "Operation successful",
  });
});

exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  await User.findByIdAndDelete(userId);

  res.status(204).json({
    success: true,
    message: "Account deleted successfully",
  });
});

exports.platformStats = asyncHandler(async (req, res, next) => {
  const totalUsers = await User.countDocuments();
  const totalEvents = await Event.countDocuments();
  const totalBookings = await Booking.countDocuments();
  const totalOrganizers = await User.countDocuments({
    role: "organizer",
  });
  const totalAttendees = await User.countDocuments({
    role: "attendee",
  });
  const totalRevenue = await Booking.aggregate([
    { $match: { status: "paid" } },
    { $group: { _id: null, total: { $sum: "$totalprice" } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalEvents,
      totalBookings,
      totalOrganizers,
      totalAttendees,
      totalRevenue: totalRevenue[0]?.total || 0,
    },
    message: "Platform statistics retrieved successfully",
  });
});

exports.eventStats = asyncHandler(async (req, res, next) => {
  const totalEvents = await Event.countDocuments();
  const totalTickets = await Booking.countDocuments();
  const totalSales = await Booking.aggregate([
    { $match: { status: "paid" } },
    { $group: { _id: null, total: { $sum: "$totalprice" } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalEvents,
      totalTickets,
      totalSales: totalSales[0]?.total || 0,
    },
    message: "Event statistics retrieved successfully",
  });
});

exports.revenueStats = asyncHandler(async (req, res, next) => {
  const filter = {};

  res.status(200).json({
    success: true,
    message: "I could not do this yet, but I will try to do it soon",
  });
});

exports.notificationTest = asyncHandler(async (req, res, next) => {
  const userEmail = req.user.email;

  try {
    await sendMail(
      "everybody",
      "testEmail",
      {
        "user.email": userEmail,
      },
      userEmail,
      "Test Notification"
    );
  } catch (error) {
    console.error("Error occurred while sending test Email:", error);
    return next(new AppError("Failed to send test Email", 500));
  }

  console.log("Sending test Email...");
  res.status(200).json({
    success: true,
    message: "Test Email sent successfully",
  });
});
