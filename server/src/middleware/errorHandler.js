//eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({ error: message });
}

export default errorHandler;
