const express = require("express")
const onlyAdmin = require("../middlewares/onlyAdmin")
const { eventAccess } = require("../middlewares/eventAccess")
const router = express.Router()
const eventController = require("../controllers/event.controller")
const { protectRoute } = require("../middlewares/protectRoute")

router.post('/', protectRoute, eventAccess, eventController.postEvent)
router.get('/search/:search', protectRoute, eventController.eventBySearch)
router.get('/category/:category',protectRoute,eventController.eventByCategory)
router.get('/',protectRoute,eventController.getAllEvents)
router.get('/:id', protectRoute, eventController.getEventById)

module.exports = router