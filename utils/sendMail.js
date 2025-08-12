const { transport } = require("./mailer"); 
const fs = require("fs");
const path = require("path");
const asyncHandler = require("./asyncHandler");
const AppError = require("./appError");

exports.sendMail = 
  async (folder, templateName, data, to, subject, next) => {
    const templatePath = path.join(
      __dirname,
      "../Templates",
      folder,
      `${templateName}.html`
    );

    let htmlTemplate;
    try {
      htmlTemplate = fs.readFileSync(templatePath, "utf-8");
    } catch (error) {
      console.error("Template read error:", error);
      return next(new AppError("Template file not found", 404));
    }

    if (!htmlTemplate) {
      return next(
        new AppError("Something went wrong loading template", 404)
      );
    }

    
    for (let key in data) {
      htmlTemplate = htmlTemplate.replace(
        new RegExp(`{{${key}}}`, "g"),
        data[key]
      );
    }

    try {
      const info = await transport.sendMail({
        from: process.env.GMAIL_USERNAME,
        to,
        subject,
        html: htmlTemplate,
      });

      console.log("Email sent successfully:", info.messageId);
      return {
        success: true,
        message: "Email sent successfully",
        info,
      };
    } catch (error) {
      console.error("Email sending error:", error);
      return next(new AppError("Failed to send email", 500));
    }
  }
;
