const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || err.status || 500;
  if (err.code === 11000) statusCode = 409;
  if (err.name === 'ValidationError' || err.name === 'CastError') statusCode = 400;
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) statusCode = 500;

  let message = err.message || 'Request failed';
  if (statusCode >= 500) message = 'Internal Server Error';
  else if (err.code === 11000) message = 'A record with this value already exists';
  else if (err.name === 'CastError') message = 'Invalid identifier';
  else if (err.name === 'ValidationError') message = 'Invalid request data';

  const response = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
