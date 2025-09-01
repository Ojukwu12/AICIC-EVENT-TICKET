const cron = require("node-cron");
const Event = require("../models/events.model");
const {sendMail} = require("../utils/sendMail");
const User = require("../models/user.model");
// check every 1 minute for new pending events and notify admins for approval
cron.schedule("0 * * * *", async () => {
  try {
    console.log("Checking for new pending events ....");
    const pendingEvents = await Event.find({
      status: "draft",
    }).lean();
    console.log("Pending events found:", pendingEvents);
    if (pendingEvents.length === 0) {
      console.log(`No pending events found`);
      return;
    }
    const admins = await User.find({ role: "admin" })
      .select("email -_id")
      .lean();
    const adminEmails = admins.map((admin) => admin.email);
    if (adminEmails.length === 0) {
      console.log("No admins found to notify");
      return;
    }
    await sendMail(
      "everybody",
      "evenToApprove",
      {
        "pendingEvents._id": pendingEvents._id,
        "pendingEvents.title": pendingEvents.title,
        "pendingEvents.description": pendingEvents.description,
      },
      adminEmails,
      "Pending Events",
      next
    );
    console.log(`Email sent to admins`);
  } catch (error) {
    console.error("error in cron job", error);
  }
});
