const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A record with this value already exists.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
