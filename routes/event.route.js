const express = require("express")
const onlyAdmin = require("../middlewares/onlyAdmin")
const { eventAccess } = require("../middlewares/eventAccess")
const router = express.Router()
const cache = require("../middlewares/cache");
const eventController = require("../controllers/event.controller")
const { protectRoute } = require("../middlewares/protectRoute");
const upload = require("../utils/multer");



router.post('/', protectRoute, eventAccess, upload.array("media", 4), eventController.postEvent)
router.get('/search/:search', protectRoute, cache, eventController.eventBySearch)
router.get('/category/:category',protectRoute, cache,eventController.eventByCategory)
router.get('/',protectRoute, cache,eventController.getAllEvents)
router.get('/:id', protectRoute, cache,eventController.getEventById)
router.delete('/:id', protectRoute, onlyAdmin, eventController.deleteEvent)
router.put('/:id', protectRoute, eventAccess, eventController.updateEvent)
router.get('/organizer/:organizerId', protectRoute, cache, eventController.getEventByOrganizer)
module.exports = router