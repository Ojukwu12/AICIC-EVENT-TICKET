const express = require("express");
const morgan = require("morgan");
const app = express();
const AppError = require("./utils/appError");
const { userRoute } = require("./routes/user.route");
const authRoute = require("./routes/auth.route");
const eventRoute = require("./routes/event.route")
const ticketRoute = require("./routes/ticket.route");
const paymentRoute = require("./routes/payment.route");
const adminRoute = require("./routes/admin.route");
const errorHandler = require("./controllers/error.controller");
const cookieParser = require("cookie-parser");
const limiter = require("./middlewares/ratelimit");

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(limiter);

app.use("/api/v1/users", userRoute);
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/events", eventRoute);
app.use("/api/v1/tickets", ticketRoute);
app.use("/api/v1/payments", paymentRoute);
app.use("/api/v1/admin", adminRoute);

app.use((req, res, next) => {
  next(
    new AppError(
      `This ${req.method} :${req.url} does not exist on this server`,
      404
    )
  );
});

app.use(errorHandler.globalErrorHandler);

module.exports = app;
