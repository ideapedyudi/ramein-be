import ApiError from "../utils/apiError.js";

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden"));
    }
    return next();
  };
}

export default authorize;
