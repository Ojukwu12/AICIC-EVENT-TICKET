const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
const axios = require("axios");
const Booking = require("../models/booking.model");
const User = require("../models/user.model");
const Event = require("../models/event.model");
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
  if (booking.totalPrice === 0) {
    return next(
      new AppError(
        "Payment for free events is not on this route",
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
      amount: value.amount * 100, // Paystack expects amount in kobo
      metaData: {
        eventId: value.eventId,
        bookingId: value.bookingId,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );
  const { authorization_url, reference } = response.data.data;
  booking.ticketRef = reference;
  res
    .status(200)
    .json({
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
    await Booking.findOneAndUpdate(
      paymentData.metaData.bookingId,
      { paymentDetails: paymentData },
      { status: "paid" },
      { expiresAt: null }, // Clear the expiration date
      {
        paymentInfo: {
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
        },
      },
      { new: true }
    );
    res
      .status(200)
      .json({
        status: "success",
        message: "Payment verified successfully",
      });
  } else {
    await Booking.findOneAndUpdate(
      paymentData.metaData.bookingId,
      { status: "pending", paymentDetails: null },
      { new: true }
    );
    res
      .status(400)
      .json({
        status: "failed",
        message: "Payment verification failed",
      });
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
  }
  const event = req.body;
  const paymentData = event.data;
  if (event.event === "charge.failed") {
    const bookingId = event.data.metadata.bookingId;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }
    if (booking.status === "cancelled") {
      return res
        .status(200)
        .json({
          status: "success",
          message: "Booking already cancelled",
        });
    }
    booking.status = "pending";
    booking.paymentDetails = null;
    await booking.save();
    res
      .status(400)
      .json({
        status: "success",
        message: "Payment failed, booking updated successfully",
      });
  }
  if (event.event === "charge.success") {
    const bookingId = event.data.metadata.bookingId;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }
    if (booking.status === "paid") {
      return res
        .status(200)
        .json({ status: "success", message: "Booking already paid" });
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
    res
      .status(200)
      .json({
        status: "success",
        message: "Payment successful, booking updated successfully",
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

  res.status(200).json({ status: "success", data: details });
});

