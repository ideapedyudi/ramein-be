import { getBearerToken, getUserFromToken } from "./authenticate.js";

async function optionalAuthenticate(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return next();
  }

  try {
    req.user = await getUserFromToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
}

export default optionalAuthenticate;
