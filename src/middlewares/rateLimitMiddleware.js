import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const genericMessage = {
  message: "Too many requests. Please try again later.",
  success: false,
};

const normalizedEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const createSensitiveRateLimiter = ({
  max,
  windowMs,
  byEmail = false,
  store,
}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: genericMessage,
    store,
    keyGenerator: (req) => {
      const ip = ipKeyGenerator(req.ip);
      const email = byEmail ? normalizedEmail(req.body?.email) : "";
      return email ? `${ip}:${email}` : ip;
    },
  });
