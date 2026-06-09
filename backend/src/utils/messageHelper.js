export const updateConversationAfterCreateMessage = (conversation, message, senderId) =>{
  const createdAt = message.createdAt || new Date();

  if(!conversation.unreadCounts){
    conversation.unreadCounts = new Map();
  }

  conversation.set({
    seenBy: [],
    lastMessageAt: createdAt,
    lastMessage: {
      _id: message._id,
      content: message.content,
      senderId,
      createdAt,
    }
  })

  conversation.participants.forEach((p) =>{
    const memberId =p.userId.toString();
    const isSender = memberId === senderId.toString();
    const prevCount = conversation.unreadCounts?.get(memberId) || 0;
    conversation.unreadCounts.set(memberId, isSender ? 0 : prevCount + 1);
  })
}
