const express = require("express")
const router = express.Router()
const onlyAdmin = require("../middlewares/onlyAdmin")
const adminController = require("../controllers/admin.controller")
const { protectRoute } = require("../middlewares/protectRoute")

router.get('/users',protectRoute, onlyAdmin, adminController.getAllUsers)
router.put('/users/:id', protectRoute, onlyAdmin, adminController.updateUserDetails)
router.delete('/users/:id', protectRoute, onlyAdmin, adminController.deleteAccount)
router.get('/events', protectRoute, onlyAdmin, adminController.getEvents)
router.put('/events/:id/approve', protectRoute, onlyAdmin, adminController.eventApproval)
router.get('/bookings', protectRoute, onlyAdmin, adminController.getBookings)
router.get('/stats/overview', protectRoute, onlyAdmin, adminController.platformStats)
router.get('/stats/events', protectRoute, onlyAdmin, adminController.eventStats)
router.get('/stats/revenue', protectRoute, onlyAdmin, adminController.revenueStats)
router.post('/notifications/test', protectRoute, onlyAdmin, adminController.notificationTest)

module.exports = router;