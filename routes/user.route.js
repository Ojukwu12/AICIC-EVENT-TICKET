const express = require('express');
const userController = require('../controllers/user.controller');
const { protectRoute } = require('../middlewares/protectRoute');
const Router = express.Router();

Router.get('/', protectRoute, userController.getAllUsers);

module.exports = {
 userRoute: Router
}