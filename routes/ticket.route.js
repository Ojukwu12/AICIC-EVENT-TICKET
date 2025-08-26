const express = require("express")
const onlyAdmin = require("../middlewares/onlyAdmin")
const { eventAccess } = require("../middlewares/eventAccess")
const router = express.Router()
const ticketController = require("../controllers/ticket.controller")
const { protectRoute } = require("../middlewares/protectRoute")
const cache = require("../middlewares/cache")
router.post('/reserve', protectRoute, ticketController.reserveBooking)
router.get('/', protectRoute, ticketController.getBookingByUser)
router.get('/:ticketId', protectRoute, cache, ticketController.getBookingById)
router.put('/:ticketId/cancel', protectRoute, ticketController.cancelBooking)
router.get('/events/:eventId/availability', protectRoute, ticketController.getBookingByEvent)
router.get('/organizer/events/:eventId/bookings', protectRoute, cache, eventAccess, ticketController.getBookingByEvent)
router.get('/admin/tickets', protectRoute, onlyAdmin, ticketController.getAllBookings)
router.get('/reference/:reference', protectRoute, ticketController.getBookingByReference) 


module.exports = router