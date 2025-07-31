const nodeMailer = require('nodemailer');

const transport = nodeMailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD
  }
})

async function sendEmail(to, subject, text) {
 try {
  await transport.sendMail({
   from: `${process.env.GMAIL_USERNAME}`,
   to,
   subject,
    text: `${text}`
  })
  console.log("Email sent successfully");
} catch (error) {
  throw error;
 }
}

module.exports = sendEmail