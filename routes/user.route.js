const express = require('express');
const userController = require('../controllers/user.controller');
const Router = express.Router();

Router.get('/', userController.getAllUsers);

module.exports = {
  userRoute: Router
}