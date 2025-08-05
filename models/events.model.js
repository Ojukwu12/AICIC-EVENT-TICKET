const mongoose = require('mongoose');
const User = require('./user.model');


const eventSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, "An event must have a title"],
  },
  description: {
    type: String,
    required: [true, "An event must have a description"],
  },
  category: {
    type: String,
    required: [true, "An event must have a category"],
    enum: [
      "workshop",
      "seminar",
      "conference",
      "meetup",
      "party",
      "other",
    ],
    default: "other",
  },
  // Logistics
  date: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  // Status Management
  status: {
    type: String,
    enum: ["draft", "published", "cancelled"],
    default: "draft",
    required: true,
  },
  // Capacity tracking
  totalTickets: {
    type: Number,
    required: [true, "Specify the number of tickets available"],
    min: 1,
  },
  availableTickets: {
    type: Number,
    required: true,
    min: 0
  },
  // Media
  media: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Relationships
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Pricing
  price:{
   type: Number,
   min: 0
  }
});

const Event = mongoose.model("Event", eventSchema)

module.exports = Event