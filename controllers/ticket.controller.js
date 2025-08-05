const Booking = require("../models/tickets.model");
const User = require("../models/user.model");
const Event = require("../models/events.model");
const AppError = require("../utils/appError");
const asyncHandler = require("../utils/asyncHandler");
const joi = require("joi");
const mongoose = require("mongoose");

exports.reserveBooking = asyncHandler(async (req, res, next) => {
  const Schema = joi.object({
    attendee: joi.string().required(),
    event: joi.string().required(),
    quantity: joi.number().required().min(1),
  });
  const { value, error } = Schema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  // Check if event exists and get event details
  const event = await Event.findById(value.event);
  if (!event) {
    return next(new AppError("Event not found", 404));
  }

  // Check if event date is in the future
  if (new Date() > new Date(event.date)) {
    return next(
      new AppError("Cannot book tickets for past events", 400)
    );
  }

  // Check if enough tickets are available
  if (value.quantity > event.availableTickets) {
    return next(new AppError("Not enough tickets available", 400));
  }

  // Check if booking already exists for this user and event
  const existingBooking = await Booking.findOne({
    attendee: value.attendee,
    event: value.event,
  });
  if (existingBooking) {
    return next(
      new AppError("Booking already exists for this event", 400)
    );
  }

  // Calculate total price
  const totalPrice = value.quantity * event.price;
  value.totalprice = totalPrice;

  // Create the booking
  const newBooking = await Booking.create(value);

  // Update available tickets
  await Event.findByIdAndUpdate(
    value.event,
    {
      $inc: { availableTickets: -value.quantity },
    },
    { new: true }
  );

  // Set expiration time for unpaid bookings
  if (newBooking.status !== "paid") {
    newBooking.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await newBooking.save();
  }

  res.status(201).json({
    status: "success",
    data: { booking: newBooking },
    message:
      "Booking created successfully. Booking will expire in 24 hours. Please complete your payment.",
  });
});

exports.getBookingByUser = asyncHandler(async (req, res, next) => {
  const user = req.user._id;
  const bookings = await Booking.find({ attendee: user })
    .populate("event", "title")
    .populate("attendee", "name");
  if (!bookings || bookings.length === 0) {
    return next(new AppError("NO BOOKINGS FOUND", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      bookings,
    },
  });
});

exports.availableEvents = asyncHandler(async (req, res, next) => {
  const events = await Event.find({ availableTickets: { $gt: 0 } })
    .populate("organizer", "name email")
    .select("title date location price availableTickets");

  if (!events || events.length === 0) {
    return next(new AppError("No available events found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      events,
    },
  });
});

exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const bookingId = req.params.ticketId;
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  // Check if the booking belongs to the user
  if (booking.attendee.toString() !== req.user._id.toString()) {
    return next(
      new AppError(
        "You are not authorized to cancel this booking",
        403
      )
    );
  }

  // Update available tickets for the event
  await Event.findByIdAndUpdate(
    booking.event,
    {
      $inc: { availableTickets: booking.quantity },
    },
    { new: true }
  );

  // Delete the booking
  await Booking.findByIdAndDelete(bookingId);

  res.status(200).json({
    status: "success",
    message: "Booking cancelled successfully",
  });
});

exports.getBookingByEvent = asyncHandler(async (req, res, next) => {
  const eventId = req.params.eventId;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return next(new AppError("Invalid event ID format", 400));
  }

  const bookings = await Booking.find({ event: eventId })
    .populate("attendee", "name email")
    .populate("event", "title organizer");

  if (!bookings || bookings.length === 0) {
    return next(
      new AppError("No bookings found for this event", 404)
    );
  }

  // Check if user is organizer of the event
  if (
    req.user._id.toString() !== bookings[0].event.organizer.toString()
  ) {
    return next(
      new AppError(
        "You are not authorized to view bookings for this event",
        403
      )
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      bookings,
    },
  });
});

exports.getBookingById = asyncHandler(async (req, res, next) => {
  const bookingId = req.params.ticketId;
  const booking = await Booking.findById(bookingId)
    .populate("attendee", "name email")
    .populate("event", "title date location organizer");
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }
  // Check if the booking belongs to the user or if the user is the organizer of the event
  if (
    booking.attendee._id.toString() !== req.user._id.toString() &&
    booking.event.organizer.toString() !== req.user._id.toString()
  ) {
    return next(
      new AppError("You are not authorized to view this booking", 403)
    );
  }
  res.status(200).json({
    status: "success",
    data: {
      booking,
    },
  });
});

exports.getAllBookings = asyncHandler(async (req, res, next) => {

  const filter = {}
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
      { "attendee.name": { $regex: req.query.search, $options: "i" } },
      { "event.title": { $regex: req.query.search, $options: "i" } },
    ];
  }
  if (req.query.quantity) {
    filter.quantity = parseInt(req.query.quantity);
  }
  const bookings = await Booking.find(filter)
    .populate("attendee", "name email")
    .populate("event", "title price");

  if (!bookings || bookings.length === 0) {
    return next(new AppError("No bookings found", 404));
  }
  res.status(200).json({
    status: "success",
    data: {
      bookings,
    },
  });
});

exports.getBookingByReference = asyncHandler(
  async (req, res, next) => {
    const ref = req.params.reference;
    const booking = await Booking.findOne({ ticketRef: ref })
      .populate("attendee", "name")
      .populate("event", "title");
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }
    // Check if the booking belongs to the user or if the user is the organizer of the event
    if (
      booking.attendee._id.toString() !== req.user._id.toString() &&
      booking.event.organizer.toString() !== req.user._id.toString()
    ) {
      return next(
        new AppError(
          "You are not authorized to view this booking",
          403
        )
      );
    }
    res.status(200).json({
      status: "success",
      data: {
        booking,
      },
    });
  }
);
