import "dotenv/config"; // 1. Load .env vars FIRST
import express from "express";
import cors from "cors";
import { dbConnection } from "./src/configs/dbConnection.js"; // 2. Now import DB config

import allRoutes from "./src/routes/index.js";

const app = express();
const port = Number(process.env.PORT) || 3500;

const isProduction = process.env.NODE_ENV === "production";
const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const deploymentOrigins = ["https://pollify-frontend-seven.vercel.app"];
const developmentOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const allowedOrigins = new Set(
  isProduction
    ? [...deploymentOrigins, ...configuredOrigins]
    : [...developmentOrigins, ...deploymentOrigins, ...configuredOrigins],
);

const corsOptions = {
  origin(origin, callback) {
    // Non-browser and same-origin requests do not send Origin and do not need CORS.
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.has(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api", allRoutes);

app.use((error, _req, res, _next) => {
  if (error?.name === "MulterError") {
    const messages = {
      LIMIT_FILE_SIZE: "Each image must be 5 MB or smaller.",
      LIMIT_FILE_COUNT: "Too many image files were uploaded.",
      LIMIT_UNEXPECTED_FILE:
        "Unexpected upload field. Use the documented image field.",
    };
    return res.status(400).json({
      success: false,
      message: messages[error.code] || "Invalid image upload.",
    });
  }
  if (error?.status === 415) {
    return res.status(415).json({ success: false, message: error.message });
  }
  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

app.get("/", (req, res) => {
  res.send("Hello World by Muzammil Ali");
});

const startServer = async () => {
  try {
    await dbConnection();
    app.listen(port, () => {
      console.log(`http://localhost:${port}`);
    });
  } catch (error) {
    console.error(
      `Database connection failed; HTTP server was not started (${error?.name || "Error"}).`,
    );
    process.exitCode = 1;
  }
};

startServer();
