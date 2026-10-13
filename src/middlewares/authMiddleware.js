import jwt from "jsonwebtoken";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization || "";
  let token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
  if (token) {
    token = token.replace(/^"(.*)"$/, "$1").trim();
  }

  if (!token || token === "undefined" || token === "null") {
    return res.status(401).json({
      message: "No authentication token provided.",
      success: false,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id || decoded.userId || decoded._id;

    if (!req.userId) {
      return res.status(401).json({
        message: "Invalid token payload structure.",
        success: false,
      });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Your session has expired. Please log in again.",
        success: false,
      });
    }

    return res.status(401).json({
      message: "Authentication failed. Token invalid.",
      success: false,
    });
  }
};
