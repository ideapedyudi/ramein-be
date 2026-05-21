function successResponse(res, statusCode, message, data = null, meta = null) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
}

export {
  successResponse
};
