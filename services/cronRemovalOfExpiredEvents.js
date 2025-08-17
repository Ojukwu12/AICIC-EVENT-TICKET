const cron = require("node-cron");
const Event = require("../models/events.model");

cron.schedule("0 0 * * *", async () => {
 console.log("Running scheduled task to update event statuses...");
 try{
  const currentDate = new Date()
  currentDate.setUTCHours(0,0,0,0);
  const endedEvents = await Event.find({
   status: { $in: ["published", "draft"] },
   endDate: { $lt: currentDate }
  });
  if (endedEvents.length > 0) {
   for(let event of endedEvents) {
    event.status = "ended";
    await event.save();
    console.log(`Event ${event.title} has been marked as ended.`);
   }
  }
 } catch (error) {
  console.error("Error occurred while updating event statuses:", error);
 }
})