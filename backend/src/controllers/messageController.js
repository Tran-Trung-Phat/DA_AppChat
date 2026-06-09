import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { updateConversationAfterCreateMessage } from "../utils/messageHelper.js";
import mongoose from "mongoose";

export const sendDirectMessage = async (req, res) =>{
  try {
    const {recipientId, content, conversationId} = req.body;
    const senderId = req.user._id;


    let conversation;

    if(!content) {
      return res.status(400).json({message:'Thiếu nội dung'})
    }

    if(conversationId){
      if(!mongoose.isValidObjectId(conversationId)){
        return res.status(400).json({message:'ID cuộc trò chuyện không hợp lệ'})
      }

      conversation = await Conversation.findById(conversationId)

      if(!conversation){
        return res.status(404).json({message:'Không tìm thấy cuộc trò chuyện'})
      }
    }

    if(!conversationId){
      if(!mongoose.isValidObjectId(recipientId)){
        return res.status(400).json({message:'ID người nhận không hợp lệ'})
      }

      conversation = await Conversation.create({
        type: 'direct',
        participants: [
          {userId: senderId, joinedAt: new Date()},
          {userId: recipientId, joinedAt: new Date()}
        ],
        lastMessageAt: new Date(),
        unreadCounts: {}
      })
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
    });
    updateConversationAfterCreateMessage(conversation,message,senderId);

    await conversation.save();

    return res.status(201).json({message:'Gửi tin nhắn thành công', data: message});
  }catch(error){
    console.error('Lỗi khi gửi tin  nhắn trực tiếp',error);
    return res.status(500).json({message:'Lỗi hệ thống'})
  }


};
export const sendGroupMessage = async (req, res) =>{
  try {
    const {conversationId, content} = req.body;
    const senderId = req.user._id;
    const conversation = req.conversation;

    if(!content) {
      return res.status(400).json({message:'Thiếu nội dung'})
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content
    });


    updateConversationAfterCreateMessage(conversation,message,senderId);

    await conversation.save();

    return res.status(201).json({message});
  }catch (error) {
     console.error('Lỗi xảy ra khi gửi tin nhắn nhóm',error);
     return res.status(500).json({message:'Lỗi hệ thống'})
  }
};
