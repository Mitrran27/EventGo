const success = (res, data = {}, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });

const error = (res, message = 'An error occurred', status = 500, errors = null) =>
  res.status(status).json({ success: false, message, ...(errors && { errors }) });

module.exports = { success, error };
