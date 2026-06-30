import Story from "../models/Story.js";
import Friend from "../models/Friend.js";
import mongoose from "mongoose";

export const createStory = async (req, res) => {
  try {
    const { content, mediaType, itemType } = req.body;
    const userId = req.user._id;

    let mediaUrl = "";
    if (req.file) {
      mediaUrl = (req.file.path && (req.file.path.startsWith("http://") || req.file.path.startsWith("https://")))
        ? req.file.path
        : `${req.protocol}://${req.get("host")}/uploads/stories/${req.file.filename}`;
    }

    const isStory = itemType === "story";
    const expiresAt = isStory
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years

    const story = new Story({
      user: userId,
      mediaUrl,
      mediaType: mediaType || "text",
      content: content || "",
      itemType: itemType || "post",
      expiresAt,
    });

    await story.save();
    await story.populate("user", "_id displayName username avatarUrl");

    return res.status(201).json({ story });
  } catch (error) {
    console.error("Lỗi khi tạo story:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi tạo story" });
  }
};

export const getStories = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find friends
    const friends = await Friend.find({
      $or: [
        { userA: userId },
        { userB: userId }
      ]
    });

    const friendIds = friends.map((f) =>
      f.userA.toString() === userId.toString() ? f.userB : f.userA
    );
    friendIds.push(userId); // Include myself

    // Find non-expired active stories
    const stories = await Story.find({
      user: { $in: friendIds },
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "_id displayName username avatarUrl")
      .populate("comments.user", "_id displayName username avatarUrl")
      .sort({ createdAt: -1 });

    return res.status(200).json({ stories });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách story:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi lấy story" });
  }
};

export const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ message: "ID story không hợp lệ" });
    }

    const story = await Story.findOneAndUpdate(
      { _id: storyId, status: "active" },
      { $addToSet: { views: userId } },
      { new: true }
    );

    if (!story) {
      return res.status(404).json({ message: "Không tìm thấy hoặc story đã hết hạn" });
    }

    return res.status(200).json({ message: "Đã xem story thành công" });
  } catch (error) {
    console.error("Lỗi khi xem story:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi xem story" });
  }
};

export const toggleLikeStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ message: "ID story không hợp lệ" });
    }

    const story = await Story.findOne({ _id: storyId, status: "active" });
    if (!story) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    const alreadyLiked = story.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      story.likes = story.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      story.likes.push(userId);
    }

    await story.save();

    return res.status(200).json({ likes: story.likes });
  } catch (error) {
    console.error("Lỗi khi thích bài viết:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi thích bài viết" });
  }
};

export const commentStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(storyId)) {
      return res.status(400).json({ message: "ID story không hợp lệ" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung bình luận không được để trống" });
    }

    const story = await Story.findOne({ _id: storyId, status: "active" });
    if (!story) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    const newComment = {
      user: userId,
      content: content.trim(),
      createdAt: new Date(),
    };

    story.comments.push(newComment);
    await story.save();

    // Populate the last comment's user data for the response
    const savedComment = story.comments[story.comments.length - 1];
    await story.populate({
      path: "comments.user",
      match: { _id: savedComment.user },
      select: "_id displayName username avatarUrl",
    });

    const populatedComment = story.comments.find(
      (c) => c._id.toString() === savedComment._id.toString()
    );

    return res.status(201).json({ comment: populatedComment });
  } catch (error) {
    console.error("Lỗi khi bình luận:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi bình luận" });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { storyId, commentId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(storyId) || !mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const story = await Story.findOne({ _id: storyId, status: "active" });
    if (!story) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    const comment = story.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    // Chỉ cho phép người bình luận hoặc chủ bài viết xóa
    const isCommentOwner = comment.user.toString() === userId.toString();
    const isStoryOwner = story.user.toString() === userId.toString();

    if (!isCommentOwner && !isStoryOwner) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
    }

    story.comments.pull(commentId);
    await story.save();

    return res.status(200).json({ message: "Đã xóa bình luận thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa bình luận:", error);
    return res.status(500).json({ message: "Lỗi hệ thống khi xóa bình luận" });
  }
};
