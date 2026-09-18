export const errorHandler = (err, req, res, next) => {
  console.error(err);
  
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const statusCode = err.status || 500;

  res.status(statusCode).json({
    error: {
      code,
      message
    }
  });
};
