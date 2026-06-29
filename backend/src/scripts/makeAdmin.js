import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import User from "../models/user.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const identity = process.argv[2]?.trim().toLowerCase();

if (!identity) {
  console.error("Cach dung: npm run make-admin -- <username-hoac-email>");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
  const user = await User.findOne({
    $or: [{ username: identity }, { email: identity }],
  });

  if (!user) {
    console.error(`Khong tim thay tai khoan: ${identity}`);
    process.exitCode = 1;
  } else {
    user.role = "admin";
    user.adminRole = "super_admin";
    user.isActive = true;
    await user.save();
    console.log(`Da cap quyen admin cho ${user.username} (${user.email})`);
  }
} catch (error) {
  console.error("Khong the cap quyen admin:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
