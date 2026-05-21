import { validationResult  } from "express-validator";

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    message: "Validation error",
    data: errors.array()
  });
}

export default validateRequest;
