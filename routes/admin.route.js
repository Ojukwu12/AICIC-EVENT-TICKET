const express = require("express")
const router = express.Router()
const onlyAdmin = require("../middlewares/onlyAdmin")
const adminController = require("../controllers/admin.controller")

router.get('/users', onlyAdmin, adminController.getAllUsers)
router.put('/users/:id', onlyAdmin, adminController.updateUserDetails)
router.delete('/users/:id', onlyAdmin, adminController.deleteAccount)
router.get('/events', onlyAdmin, adminController.getEvents)
router.put('/events/:id/approve', onlyAdmin, adminController.eventApproval)
router.get('/bookings', onlyAdmin, adminController.getBookings)
router.get('/stats/overview', onlyAdmin, adminController.platformStats)
router.get('/stats/events', onlyAdmin, adminController.eventStats)
router.get('/stats/revenue', onlyAdmin, adminController.revenueStats)
router.post('/notifications/test', onlyAdmin, adminController.notificationTest)

module.exports = router;