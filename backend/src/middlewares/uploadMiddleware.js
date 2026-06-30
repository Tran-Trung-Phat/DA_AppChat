import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary, { isCloudinaryConfigured } from "../libs/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const avatarDir = path.join(__dirname, "../../uploads/avatars");
const messageDir = path.join(__dirname, "../../uploads/messages");
const storyDir = path.join(__dirname, "../../uploads/stories");

fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(messageDir, { recursive: true });
fs.mkdirSync(storyDir, { recursive: true });

// --- Image file filter for Avatars ---
const imageFileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Chi duoc upload file anh"));
  }
  cb(null, true);
};

// ==========================================
// 1. Storage & Middleware for Avatars
// ==========================================
let avatarStorage;

if (isCloudinaryConfigured) {
  avatarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "moji/avatars",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      public_id: (req, file) => {
        const userId = req.user?._id || "anonymous";
        return `${userId}-${Date.now()}`;
      },
    },
  });
} else {
  avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.user._id}-${Date.now()}${ext}`);
    },
  });
}

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export const uploadSingleAvatar = (req, res, next) => {
  uploadAvatar.single("avatar")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Anh dai dien toi da 2MB" });
    }

    return res.status(400).json({ message: error.message || "Upload avatar that bai" });
  });
};

// ==========================================
// 2. Storage & Middleware for Chat Messages
// ==========================================
let messageStorage;

if (isCloudinaryConfigured) {
  messageStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const userId = req.user?._id || "anonymous";
      return {
        folder: "moji/messages",
        resource_type: "auto", // Automatically detects images, audios, videos, or raw files (docs)
        public_id: `${userId}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      };
    },
  });
} else {
  messageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, messageDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.user._id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
}

export const uploadMessageFiles = multer({
  storage: messageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

export const uploadMessageAttachments = (req, res, next) => {
  uploadMessageFiles.array("attachments", 5)(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Tep dinh kem toi da 10MB" });
    }

    return res.status(400).json({ message: error.message || "Upload tep that bai" });
  });
};

// ==========================================
// 3. Storage & Middleware for Stories / Feed Posts
// ==========================================
let storyStorage;

if (isCloudinaryConfigured) {
  storyStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "moji/stories",
      resource_type: "auto",
      public_id: (req, file) => {
        const userId = req.user?._id || "anonymous";
        return `${userId}-story-${Date.now()}`;
      },
    },
  });
} else {
  storyStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, storyDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.user._id}-story-${Date.now()}${ext}`);
    },
  });
}

export const uploadStoryFile = multer({
  storage: storyStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export const uploadSingleStoryMedia = (req, res, next) => {
  uploadStoryFile.single("media")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File đính kèm story tối đa 10MB" });
    }

    return res.status(400).json({ message: error.message || "Upload file story thất bại" });
  });
};

// ==========================================
// 4. Storage & Middleware for Cover Photos
// ==========================================
let coverStorage;

if (isCloudinaryConfigured) {
  coverStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "moji/covers",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      public_id: (req, file) => {
        const userId = req.user?._id || "anonymous";
        return `${userId}-cover-${Date.now()}`;
      },
    },
  });
} else {
  const coverDir = path.join(__dirname, "../../uploads/covers");
  fs.mkdirSync(coverDir, { recursive: true });
  coverStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, coverDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.user._id}-cover-${Date.now()}${ext}`);
    },
  });
}

export const uploadCover = multer({
  storage: coverStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Cover can be up to 5MB
  },
});

export const uploadSingleCover = (req, res, next) => {
  uploadCover.single("cover")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Ảnh bìa tối đa 5MB" });
    }

    return res.status(400).json({ message: error.message || "Upload ảnh bìa thất bại" });
  });
};
