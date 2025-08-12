const AppError = require("../utils/appError");

function handleCastErrorDB(err) {
  const message = `${err.value} is not a valid ${err.kind} for ${err.path}`;
  return new AppError(message, 400);
}

function handleValidationErrorDB(err) {
  const message = Object.values(err.errors)
    .map((el) => el.message)
    .join(". ");
  return new AppError(message, 400);
}

function handleDuplicateFieldsDB(err) {
  const message = `This ${Object.keys(err.keyPattern)[0]}: ${
    Object.values(err.keyValue)[0]
  } already exists`;
  return new AppError(message, 400);
}

function handleJWTError() {
  return new AppError("Invalid token. Please log in again.", 401);
}

function handleJWTExpiredError() {
  return new AppError(
    "Your token has expired. Please log in again!",
    401
  );
}

function sendDevError(err, res) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong somewhere";
  res.status(statusCode).json({ message, err: err });
}

function sendProdError(err, res) {
  if (err.isOperational) {
    res.status(err.statusCode).json({ message: err.message });
  } else {
    res
      .status(500)
      .json({
        message:
          "Something went horribly wrong, please try again later",
      });
  }
}

exports.globalErrorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    sendDevError(err, res);
  } else{
    let error = { ...err };
    error.message = err.message;
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError")
      error = handleJWTExpiredError();

    sendProdError(error, res);
  }
};
