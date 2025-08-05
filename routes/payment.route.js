const express = require("express");
const { protectRoute } = require("../middlewares/protectRoute");
const paymentController = require("../controllers/payment.controller");
const router = express.Router();
const onlyAdmin = require("../middlewares/onlyAdmin");

router.post("/initialize", protectRoute, paymentController.initializePayment);
router.get("/verify/:reference", protectRoute, paymentController.verifyPayment);
router.get("/admin/payment", protectRoute, onlyAdmin, paymentController.getAllPayments);
router.get("/user/payment", protectRoute, paymentController.getUserPayments);
router.get("/:id", protectRoute, paymentController.getPaymentDetails);
router.get("/tickets/:ticketId/payment", protectRoute, paymentController.getPaymentInfo);
router.post("/webhook", paymentController.webhook);
router.post("/tickets/:ticketId/complete-free", protectRoute, paymentController.completeFreeBookings);

module.exports = router;