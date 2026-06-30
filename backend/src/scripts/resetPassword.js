import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Session from "../models/Session.js";
import User from "../models/user.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
if (!process.env.MONGODB_CONNECTIONSTRING) {
  dotenv.config({ path: path.join(__dirname, "../../.env") });
}

const identity = process.argv[2]?.trim().toLowerCase();
const password = process.argv[3];

if (!identity || !password) {
  console.error(
    "Cach dung: npm run reset-password -- <username-hoac-email> <mat-khau-moi>"
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("Mat khau moi phai co it nhat 8 ky tu");
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
    user.hashedPassword = await bcrypt.hash(password, 10);
    user.isActive = true;
    await user.save();
    await Session.deleteMany({ userId: user._id });
    console.log(`Da dat lai mat khau cho ${user.username} (${user.email})`);
  }
} catch (error) {
  console.error("Khong the dat lai mat khau:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
