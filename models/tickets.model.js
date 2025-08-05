const mongoose = require('mongoose');
const User = require('./user.model');
const Event = require('./events.model');
const { required } = require('joi');

const bookingSchema = new mongoose.Schema({
 attendee:{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
 }
,
 event: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Event',
  required: true
},
 ticketRef: {
  type: String,
  unique: true
},
quantity: {
  type: Number,
  min: 1
},
totalprice: {
  type: Number,
  required: true
},
paymentDetails: {
  type: Object,
  default: {}
},
paymentInfo:{
  reference: String,
  amount: Number,
  currency: String,
  paidAt: Date,
  channel: String,
  bank: String,
  cardType: String,
  customer: {
    email: String,
    name: String,
  },
},
status: {
  type: String,
  enum:['reserved', 'paid', 'cancelled'],
  default: 'reserved'
},
expiresAt: {
  type: Date,
  index: { expires: 0 }
}},
{ timestamps: true }
)

bookingSchema.pre('save', async function(next){
  if (!this.ticketRef) {
    this.ticketRef= `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;   }
  next();
})

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
