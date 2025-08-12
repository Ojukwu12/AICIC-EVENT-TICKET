const nodeMailer = require('nodemailer');

const transport = nodeMailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD
  }
})

module.exports = { transport };