import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const avatarDir = path.join(__dirname, "../../uploads/avatars");
const messageDir = path.join(__dirname, "../../uploads/messages");

fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(messageDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const imageFileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Chi duoc upload file anh"));
  }

  cb(null, true);
};

export const uploadAvatar = multer({
  storage,
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

const messageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, messageDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

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

const storyDir = path.join(__dirname, "../../uploads/stories");
fs.mkdirSync(storyDir, { recursive: true });

const storyStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storyDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-story-${Date.now()}${ext}`);
  },
});

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
