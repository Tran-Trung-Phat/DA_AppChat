import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/user.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, "../../uploads");

const removeLocalAvatar = (avatarUrl) => {
    if(!avatarUrl || !avatarUrl.includes("/uploads/avatars/")) return;

    try {
        const filename = avatarUrl.split("/uploads/avatars/")[1];
        const filePath = path.join(uploadsRoot, "avatars", filename);

        if(filePath.startsWith(path.join(uploadsRoot, "avatars"))) {
            fs.rmSync(filePath, {force:true});
        }
    }catch (error) {
        console.error("Loi khi xoa avatar cu", error);
    }
}

export const authMe = async (req, res) => {
    try {
        const user= req.user; // user đã được xác minh trong authMiddleware
        return res.status(200).json({user})
    }catch (error) {
        console.error('Lỗi khi gọi authMe',error);
        return res.status(500).json({message:'Lỗi hệ thống'});
    }
}

export const updateMe = async (req, res) => {
    try {
        const {displayName, email, bio, phone, avatarUrl} = req.body;
        const updates = {};

        if(displayName !== undefined) {
            const value = String(displayName).trim();

            if(!value) {
                return res.status(400).json({message:"Ten hien thi khong duoc de trong"});
            }

            updates.displayName = value;
        }

        if(email !== undefined) {
            const value = String(email).trim().toLowerCase();

            if(!value) {
                return res.status(400).json({message:"Email khong duoc de trong"});
            }

            const duplicate = await User.findOne({
                _id: {$ne: req.user._id},
                email: value,
            });

            if(duplicate) {
                return res.status(409).json({message:"Email da ton tai"});
            }

            updates.email = value;
        }

        if(bio !== undefined) {
            updates.bio = String(bio).trim().slice(0, 500);
        }

        if(phone !== undefined) {
            updates.phone = String(phone).trim();
        }

        if(avatarUrl !== undefined) {
            const value = String(avatarUrl).trim();

            if(value) {
                try {
                    new URL(value);
                } catch {
                    return res.status(400).json({message:"Avatar URL khong hop le"});
                }
            }

            updates.avatarUrl = value;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {$set: updates},
            {new:true, runValidators:true}
        ).select("-hashedPassword");

        return res.status(200).json({user});
    }catch (error) {
        console.error("Loi khi cap nhat thong tin user", error);
        return res.status(500).json({message:"Loi he thong"});
    }
}

export const uploadMeAvatar = async (req, res) => {
    try {
        if(!req.file) {
            return res.status(400).json({message:"Vui long chon file anh"});
        }

        const previousAvatar = req.user.avatarUrl;
        const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {$set: {avatarUrl}},
            {new:true, runValidators:true}
        ).select("-hashedPassword");

        removeLocalAvatar(previousAvatar);

        return res.status(200).json({user});
    }catch (error) {
        console.error("Loi khi upload avatar", error);
        return res.status(500).json({message:"Loi he thong"});
    }
}

export const searchUsers = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();

        if(q.length < 2) {
            return res.status(200).json({users: []});
        }

        const safeQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const users = await User.find({
            _id: {$ne: req.user._id},
            $or: [
                {username: {$regex: safeQuery, $options: "i"}},
                {displayName: {$regex: safeQuery, $options: "i"}},
                {email: {$regex: safeQuery, $options: "i"}},
            ]
        })
        .select("_id username displayName email avatarUrl")
        .limit(10)
        .lean();

        return res.status(200).json({users});
    }catch (error) {
        console.error("Loi khi tim user", error);
        return res.status(500).json({message:"Loi he thong"});
    }
}

export const test = async (req,res) =>{
    return res.sendStatus(204);
}
