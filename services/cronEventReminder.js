const cron = require("node-cron");
const Event = require("../models/events.model");
const sendMail = require("../utils/sendMail");
const User = require("../models/user.model");
const booking = require("../models/tickets.model"); 

// checks for date of event and informs users on the day of the event 
cron.schedule("0 0 * * *", async () => {
 try{
  const currentDate = new Date();
  currentDate.setUTCHours(0, 0, 0, 0);
  const eventsToday = await Event.find({
    date: currentDate,
  }).lean();
  if (eventsToday.length === 0) {
    console.log("No events found for today");
    return;
  }
  const organizers = await User.find({
    _id: { $in: eventsToday.map((event) => event.userId) },
  }).select("email name").lean();
const organizerEmails = organizers.map((organizer) => organizer.email);
const organizerNames = organizers.map((organizer) => organizer.name);
 const attendees = await booking.find({
    event: { $in: eventsToday.map((event) => event._id) },
  }).populate("attendee", "email name").lean();
  const attendeeEmails = attendees.map((attendee) => attendee.email);
  const attendeeNames = attendees.map((attendee) => attendee.name);
  const allRecipients = [
    ...organizerNames.map((name, i) => ({ name, email: organizerEmails[i] })),
    ...attendeeNames.map((name, i) => ({ name, email: attendeeEmails[i] })),
  ];
  if (organizers.length === 0) {
    console.log("No users found to notify");
    return;
  }
  if (attendees.length === 0) {
    console.log("No attendees found to notify");
    return;
  }
  for (const user of allRecipients){
  await sendMail(
    "everybody",
    "eventReminder",
    {
      "user.name": user.name,
      "event.location": eventsToday.location,
      "event.time": eventsToday.time,
      "event.title": eventsToday.title,
      "event.date": eventsToday.date,
    },
    user.email,
    "Event Reminder",
    next
  );
}
  console.log(`Email sent to users`);
} catch (error) {
  console.error("Error occurred while sending event reminder emails:", error);
}
});
