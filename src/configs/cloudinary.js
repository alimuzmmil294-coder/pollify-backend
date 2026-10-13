import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_POLL_IMAGES = 4;
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const unsupportedImageType = () => {
  const error = new Error("Only JPEG, PNG, and WebP image files are allowed.");
  error.status = 415;
  return error;
};

const imageFileFilter = (_req, file, callback) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    return callback(unsupportedImageType());
  }
  return callback(null, true);
};

const hasAllowedImageSignature = (file) => {
  const buffer = file?.buffer;
  if (!buffer || buffer.length < 12) return false;

  if (file.mimetype === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (file.mimetype === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (file.mimetype === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  return false;
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_FILE_SIZE, files: MAX_POLL_IMAGES },
  fileFilter: imageFileFilter,
});

// MIME metadata is screened by Multer and this second check rejects files whose
// actual leading bytes do not match that declared image format before Cloudinary.
export const validateUploadedImages = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (files.some((file) => !hasAllowedImageSignature(file))) {
    return res.status(415).json({
      success: false,
      message: "Uploaded file content is not a supported image.",
    });
  }
  return next();
};

export const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "polling-app" },
      (err, result) =>
        err || !result?.secure_url
          ? reject(err || new Error("Image upload did not return a secure URL."))
          : resolve(result.secure_url),
    );
    stream.end(buffer);
  });

export default cloudinary;
