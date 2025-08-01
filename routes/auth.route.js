const express = require('express');
const authController = require('../controllers/auth.controller');
const protectRoute = require('../middlewares/protectRoute');
const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/get-myProfile', protectRoute.protectRoute, authController.getMyProfile);
router.post('/logout', authController.logout);
module.exports = router;
