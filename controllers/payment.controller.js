const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const axios = require("axios");
const Booking = require("../models/tickets.model");
const joi = require("joi");
const crypto = require("crypto");
const mongoose = require("mongoose");

exports.initializePayment = asyncHandler(async (req, res, next) => {
  const schema = joi.object({
    email: joi.string().email().required(),
    amount: joi.number().min(100).required(),
    eventId: joi.string().required(),
    bookingId: joi.string().required(),
  });
  const { value, error } = schema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  if (!mongoose.Types.ObjectId.isValid(value.eventId)) {
    return next(new AppError("Invalid event ID", 400));
  }
  if (!mongoose.Types.ObjectId.isValid(value.bookingId)) {
    return next(new AppError("Invalid booking ID", 400));
  }
  if (req.user.email.toString() !== value.email.toString()) {
    return next(
      new AppError("You are not authorized to make this payment", 403)
    );
  }
  const booking = await Booking.findById(value.bookingId);
  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }
  if (booking.attendee.toString() !== req.user._id.toString()) {
    return next(
      new AppError(
        "You are not authorized to pay for this booking",
        403
      )
    );
  }
  if (booking.totalprice === 0) {
    return next(
      new AppError(
        "Payment for free events is not on this route",
        400
      )
    );
  }
  if (booking.status === "paid" && booking.ticketRef) {
    return next(
      new AppError(
        "Payment has already been made for this booking",
        400
      )
    );
  }
  if (booking.totalPrice !== value.amount) {
    return next(
      new AppError("Payment amount does not match booking total", 400)
    );
  }
  const response = await axios.post(
    `https://api.paystack.co/transaction/initialize`,
    {
      email: value.email,
      amount: value.amount * 100, 
      metadata: {
        eventId: value.eventId,
        bookingId: value.bookingId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      timeout: 10000, // Set timeout to 10 seconds
    }
  );
  const { authorization_url, reference, ...paymentData } =
    response.data.data;
  booking.ticketRef = reference;
  booking.paymentDetails = { ...paymentData };
  await booking.save();

  res.status(200).json({
    status: "pending",
    reference,
    paymentLink: authorization_url,
  });
});
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const reference = req.params.reference;
  if (!reference) {
    return next(new AppError("Payment reference is required", 400));
  }
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );
  const paymentData = response.data.data;
  if (paymentData.status === "success") {
    await Booking.findByIdAndUpdate(
      paymentData.metadata.bookingId,
      {
        status: "paid",
        paymentDetails: paymentData,
        expiresAt: null,
        paymentInfo: {
          amount: paymentData.amount / 100,
          currency: paymentData.currency,
          paidAt: new Date(paymentData.paid_at),
          reference: paymentData.reference,
          channel: paymentData.channel,
          bank: paymentData.authorization.bank,
          cardType: paymentData.authorization.card_type,
          customer: {
            email: paymentData.customer.email,
            name: paymentData.customer.name,
          },
        },
      },
      { new: true }
    );
    res.status(200).json({
      success: "true",
      message: "Payment verified successfully",
    });
  } else if (paymentData.status === "failed") {
    // ✅ Fixed: else if
    await Booking.findByIdAndUpdate(
      paymentData.metadata.bookingId,
      { status: "pending", paymentDetails: null },
      { new: true }
    );
    res.status(200).json({
      success: "true",
      message: "Payment verification failed",
    });
  } else {
    return next(new AppError("Unhandled payment status", 400));
  }
});

exports.webhook = asyncHandler(async (req, res, next) => {
  const sig = req.headers["x-paystack-signature"];
  const payload = JSON.stringify(req.body);
  const expectedSig = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest("hex");
  if (sig !== expectedSig) {
    return next(new AppError("Invalid signature", 403));
  };
  const event = req.body;
  const paymentData = event.data;
  if (event.event === "charge.failed") {
    const bookingId = event.data.metadata.bookingId;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }
      if (booking.status === "paid") {
        return res.status(200).json({
          success: "true",
          message: "Payment already completed for this booking",
        });
      }
    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: "true",
        message: "Booking has already been cancelled",
      });
    }
    booking.status = "pending";
    booking.paymentDetails = null;
    await booking.save();
  return res.status(400).json({
    success: "true",
      message: "Payment failed, booking updated successfully",
    });
  }
 
 else if (event.event === "charge.success") {
    const bookingId = event.data.metadata.bookingId;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }
    if (booking.status === "paid") {
      return res
        .status(200)
        .json({ success: "true", message: "Booking already paid" });
    }
     if (booking.status === "cancelled") {
       return res.status(400).json({
         success: "true",
         message: "Booking has already been cancelled",
       });
     }
    booking.status = "paid";
    booking.ticketRef = event.data.reference;
    booking.paymentDetails = paymentData;
    booking.expiresAt = null; // Clear the expiration date
    booking.paymentInfo = {
      amount: paymentData.amount / 100, // Convert kobo to naira
      currency: paymentData.currency,
      paidAt: new Date(paymentData.paid_at),
      reference: paymentData.reference,
      channel: paymentData.channel,
      bank: paymentData.authorization.bank,
      cardType: paymentData.authorization.card_type,
      customer: {
        email: paymentData.customer.email,
        name: paymentData.customer.name,
      },
    };
    await booking.save();
  return  res.status(200).json({
      success: "true",
      message: "Payment successful, booking updated successfully",
    });
  }else{ // Ignore other events
 return res.status(200).json({
    success: "true",
    message: "Event received but not processed",
  });
}
});

exports.getPaymentDetails = asyncHandler(async (req, res, next) => {
  const paymentId = req.params.paymentId;

  const ticket = await Booking.findOne({ paymentDetails: paymentId });
  if (!ticket) {
    return next(new AppError("Ticket not found", 404));
  }
  const details = ticket.paymentDetails;

  res.status(200).json({
    success: "true",
    data: details,
    message: "Payment details retrieved successfully",
  });
});

exports.getPaymentInfo = asyncHandler(async (req, res, next) => {
  const bookingId = req.params.bookingId;
  const booking = await Booking.findById(bookingId).select(
    "paymentInfo"
  );

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }
  res.status(200).json({
    success: "true",
    data: booking.paymentInfo,
    message: "Payment information retrieved successfully",
  });
});
exports.getUserPayments = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const bookings = await Booking.find({ attendee: userId });
  if (!bookings || bookings.length === 0) {
    return next(new AppError("No payments found for this user", 404));
  }
  const paymentHistory = bookings.map((booking) => ({
    amount: booking.paymentInfo?.amount,
    currency: booking.paymentInfo?.currency,
    paidAt: booking.paymentInfo?.paidAt,
    reference: booking.paymentInfo?.reference,
    event: booking.event,
  }));

  res.status(200).json({
    success: "true",
    data: paymentHistory,
  });
});

exports.completeFreeBookings = asyncHandler(
  async (req, res, next) => {
    const bookingId = req.params.bookingId;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }
    if (booking.totalPrice > 0) {
      return next(new AppError("This booking is not free", 400));
    }
    if (booking.status === "paid") {
      return res.status(200).json({
        success: "true",
        message: "Booking already completed",
      });
    }
    if (booking.status === "cancelled") {
      return next(
        new AppError("This booking has been cancelled", 400)
      );
    }
    if (req.user._id.toString() !== booking.attendee.toString()) {
      return next(
        new AppError(
          "You are not authorized to complete this booking",
          403
        )
      );
    }
    booking.status = "paid";
    booking.paymentDetails = {
      status: "free",
      amount: 0,
      currency: "NGN",
      paidAt: new Date(),
      reference: crypto.randomBytes(16).toString("hex"),
    };
    booking.paymentInfo = {
      amount: 0,
      currency: "NGN",
      paidAt: new Date(),
      reference: booking.paymentDetails.reference,
      channel: "free",
      bank: null,
      cardType: null,
      customer: {
        email: req.user.email,
        name: req.user.name,
      },
    };
    await booking.save();
    res.status(200).json({
      status: "success",
      message: "Free booking completed successfully",
    });
  }
);

exports.getAllPayments = asyncHandler(async (req, res, next) => {
  const filter = req.query.filter || {};
  if (req.query.eventId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.eventId)) {
      return next(new AppError("Invalid event ID format", 400));
    }
    filter.event = req.query.eventId;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.attendeeId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.attendeeId)) {
      return next(new AppError("Invalid attendee ID format", 400));
    }
    filter.attendee = req.query.attendeeId;
  }
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const booking = await Booking.find(filter)
    .skip((page - 1) * limit)
    .limit(limit);
  const paymentData = booking.map((booking) => ({
    paymentInfo: booking.paymentInfo,
    event: booking.event,
  }));
  res.status(200).json({ status: "success", data: paymentData });
});
