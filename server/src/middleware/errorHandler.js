export function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const requestId = req?.id || 'REQ-UNKNOWN';

  console.error(`[Error] [${requestId}] ${err.name || 'Error'}: ${err.message}`);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  // Safe client response (no internal stack traces exposed)
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.isOperational ? err.message : (statusCode === 500 ? 'An unexpected platform error occurred. Please contact support.' : err.message),
      requestId,
    },
  });
}
