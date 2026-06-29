import Friend from "../models/Friend.js";
import User from "../models/user.js";
import FriendRequest from "../models/FriendRequest.js";
import mongoose from "mongoose";


export const sendFriendRequest = async (req, res) =>{
  try {
    const {to, message} = req.body;

    const from =req.user._id;

    if(!mongoose.isValidObjectId(to)){
      return res.status(400).json({message:'ID người dùng không hợp lệ'})
    }

    if(from.toString() === to.toString()){
      return res.status(400).json({message:'không thể gửi lời mời kết bạn cho chính mình'})
    }

    const useExists = await User.exists({_id: to});

    if(!useExists){
      return res.status(404).json({message:'Người dùng không tồn tại'})
    }

    const [isBlocked, hasBlocked] = await Promise.all([
      User.exists({ _id: to, blockList: from }),
      User.exists({ _id: from, blockList: to })
    ]);

    if (isBlocked || hasBlocked) {
      return res.status(403).json({ message: "Không thể gửi lời mời kết bạn do trạng thái chặn giữa hai người dùng" });
    }

    let userA = from.toString();
    let userB = to.toString();

    if(userA > userB){
      [userA,userB] = [userB,userA]
    }

    const [alreadyFriends,existingRequest] = await Promise.all([
      Friend.findOne({userA,userB}),
      FriendRequest.findOne({
        $or: [
          {from,to},
          {from:to,to:from}
        ]
      })
    ])

    if(alreadyFriends){
      return res.status(400).json({message:'Hai người đã là bạn bè'})
    }

    if(existingRequest){
      return res.status(400).json({message:'Đã có lời mời kết bạn đang chờ'})
    }

    const request = await FriendRequest.create({
      from,
      to,
      message,
    })

    return res.status(201).json({message:'Gửi lời mời kết bạn thành công',request})
    


  }catch(error){
    console.error('Lỗi khi gửi yêu cầu kết bạn',error);
    return res.status(500).json({message:'Lỗi hệ thống'})
  }
}

export const acceptFriendRequest = async (req, res) =>{
  try {
    const {requestId} = req.params;
    const userId =req.user._id;

    if(!mongoose.isValidObjectId(requestId)){
      return res.status(400).json({message:'ID lời mời kết bạn không hợp lệ'})
    }

    const request= await FriendRequest.findById(requestId);

    if(!request){
      return res.status(404).json({message:'Không tìm thấy lời mời kết bạn'})
    }

    if(request.to.toString() !== userId.toString()){
      return res.status(403).json({message:"Bạn không có quyền chấp nhận lời mời này"})
    }

    const friend = await Friend.create({
      userA: request.from,
      userB: request.to
    });

    await FriendRequest.findByIdAndDelete(requestId);

    const from = await User.findById(request.from).select(
      "_id displayName avatarUrl"
    ).lean();

    return res.status(200).json({
      message:'Chấp nhận lời mời kết bạn thành công',
      newFriend: {
        _id: from?.id,
        displayName: from?.displayName,
        avatarUrl: from?.avatarUrl,
      },
      });
    

  }catch(error){
    console.error('Lỗi khi chấp nhận lời mời kết bạn',error);
    return res.status(500).json({message:'Lỗi hệ thống'})
  }
}


export const declineFriendRequest = async (req, res) =>{
  try {

    const {requestId} =req.params;
    const userId = req.user._id;

    if(!mongoose.isValidObjectId(requestId)){
      return res.status(400).json({message:'ID lời mời kết bạn không hợp lệ'})
    }

    const request = await FriendRequest.findById(requestId);

    if(!request) {
      return res.status(404).json({message:"Không tìm thấy lời mời kết ban"}) 
       }

    if(request.to.toString() !== userId.toString()) {
      return res.status(403).json({message:"Bạn không có quyền từ chối lời mời này"})
    }

    await FriendRequest.findByIdAndDelete(requestId);

    return res.sendStatus(204);

  }catch(error){
    console.error('Lỗi khi từ chối lời mời kết bạn',error);
    return res.status(500).json({message:'Lỗi hệ thống'})
  }
}


export const getAllFriends = async (req, res) =>{
  try {

    const userId = req.user._id;

    const friendships = await Friend.find({
      $or: [
        {
          userA: userId,
        },
        {
          userB: userId
        }
      ]
    })

    .populate("userA", "_id displayName avatarUrl")
    .populate("userB", "_id displayName avatarUrl")
    .lean();


    if(!friendships.length){
      return res.status(200).json({friends: []})
    }

    const friends = friendships.map((f) => 
      f.userA._id.toString() === userId.toString() ? f.userB : f.userA);

    return res.status(200).json({ friends });

  }catch(error){
    console.error('Lỗi khi lấy danh sách bạn bè',error);
    return res.status(500).json({message:'Lỗi hệ thống'})
  }
}


export const getFriendRequests = async (req, res) =>{
  try {

    const userId = req.user._id;

    const populateFields = '_id username displayName avatarUrl';

    const [sent, received] = await Promise.all([
      FriendRequest.find({from: userId}).populate("to", populateFields),
      FriendRequest.find({to: userId}).populate("from", populateFields),
    ])
    res.status(200).json({sent,received})
  }catch(error){
    console.error('Lỗi khi lấy danh sách yêu cầu kết bạn',error);
    return res.status(500).json({message:'Lỗi hệ thống'})
  }
}

export const unfriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(friendId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    let userA = userId.toString();
    let userB = friendId.toString();
    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }

    const deletedFriend = await Friend.findOneAndDelete({ userA, userB });
    if (!deletedFriend) {
      return res.status(404).json({ message: "Hai người chưa là bạn bè" });
    }

    return res.status(200).json({ message: "Hủy kết bạn thành công" });
  } catch (error) {
    console.error("Lỗi khi hủy kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const cancelFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ message: "ID lời mời không hợp lệ" });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy lời mời kết bạn" });
    }

    if (request.from.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Bạn không thể hủy lời mời này" });
    }

    await FriendRequest.findByIdAndDelete(requestId);
    return res.status(200).json({ message: "Hủy lời mời kết bạn thành công" });
  } catch (error) {
    console.error("Lỗi khi hủy lời mời kết bạn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    if (userId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: "Không thể tự chặn chính mình" });
    }

    // Add to block list if not already there
    await User.findByIdAndUpdate(userId, {
      $addToSet: { blockList: targetUserId }
    });

    // Remove friendship if exists
    let userA = userId.toString();
    let userB = targetUserId.toString();
    if (userA > userB) {
      [userA, userB] = [userB, userA];
    }
    await Friend.findOneAndDelete({ userA, userB });

    // Remove any pending friend requests
    await FriendRequest.deleteMany({
      $or: [
        { from: userId, to: targetUserId },
        { from: targetUserId, to: userId }
      ]
    });

    return res.status(200).json({ message: "Chặn người dùng thành công" });
  } catch (error) {
    console.error("Lỗi khi chặn người dùng", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { blockList: targetUserId }
    });

    return res.status(200).json({ message: "Bỏ chặn người dùng thành công" });
  } catch (error) {
    console.error("Lỗi khi bỏ chặn người dùng", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .populate("blockList", "_id username displayName email avatarUrl")
      .lean();

    return res.status(200).json({ blockedUsers: user?.blockList || [] });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chặn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
