import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/user.js";
import Friend from "../models/Friend.js";
import FriendRequest from "../models/FriendRequest.js";
import Story from "../models/Story.js";
import mongoose from "mongoose";

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
        const avatarUrl = (req.file.path && (req.file.path.startsWith("http://") || req.file.path.startsWith("https://")))
            ? req.file.path
            : `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;
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

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    const user = await User.findById(userId)
      .select("-hashedPassword")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // 1. Lấy danh sách bài viết riêng của user (chỉ bài đăng, không phải story 24h)
    const posts = await Story.find({
      user: userId,
      status: "active",
      itemType: "post",
    })
      .populate("user", "_id displayName username avatarUrl")
      .populate("comments.user", "_id displayName username avatarUrl")
      .sort({ createdAt: -1 });

    // 2. Lấy thông tin bạn bè
    const friends = await Friend.find({
      $or: [
        { userA: userId },
        { userB: userId }
      ]
    });

    const friendIds = friends.map((f) =>
      f.userA.toString() === userId.toString() ? f.userB : f.userA
    );

    const friendsProfiles = await User.find({ _id: { $in: friendIds } })
      .select("_id displayName username avatarUrl")
      .limit(9)
      .lean();

    // 3. Trạng thái quan hệ bạn bè với người đang gửi request
    let friendshipStatus = "none"; // none, sent, received, friends, blocked

    if (userId.toString() !== req.user._id.toString()) {
      const isBlocked = req.user.blockList?.some(
        (blockedId) => blockedId.toString() === userId.toString()
      );

      if (isBlocked) {
        friendshipStatus = "blocked";
      } else {
        const request = await FriendRequest.findOne({
          $or: [
            { from: req.user._id, to: userId },
            { from: userId, to: req.user._id },
          ],
        });

        if (request) {
          friendshipStatus =
            request.from.toString() === req.user._id.toString()
              ? "sent"
              : "received";
        } else {
          const isFriend = friends.some(
            (f) =>
              f.userA.toString() === req.user._id.toString() ||
              f.userB.toString() === req.user._id.toString()
          );
          if (isFriend) {
            friendshipStatus = "friends";
          }
        }
      }
    }

    return res.status(200).json({
      user,
      posts,
      friends: friendsProfiles,
      totalFriends: friendIds.length,
      friendshipStatus,
    });
  } catch (error) {
    console.error("Lỗi lấy trang cá nhân:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi lấy thông tin trang cá nhân" });
  }
};

export const uploadMeCover = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn ảnh bìa" });
    }

    const coverUrl = (req.file.path && (req.file.path.startsWith("http://") || req.file.path.startsWith("https://")))
      ? req.file.path
      : `${req.protocol}://${req.get("host")}/uploads/covers/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { coverUrl } },
      { new: true, runValidators: true }
    ).select("-hashedPassword");

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Lỗi khi upload ảnh bìa", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi tải lên ảnh bìa" });
  }
};
