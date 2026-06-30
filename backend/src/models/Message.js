import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    kind: {
      type: String,
      enum: ["image", "file", "audio"],
      required: true,
    },
  },
  {
    _id: false,
  }
);

const locationAddressSchema = new mongoose.Schema(
  {
    country: String,
    city: String,
    district: String,
    ward: String,
    road: String,
    displayName: String,
  },
  {
    _id: false,
  }
);

const locationSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    address: {
      type: locationAddressSchema,
      default: {},
    },
    mapUrl: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true,

  },
  type: {
    type: String,
    enum: ["text", "location"],
    default: "text",
  },
  content:{
    type:String,
    trim:true
  },
  imgUrl:{
    type:String,
  },
  attachments: {
    type: [attachmentSchema],
    default: [],
  },
  location: {
    type: locationSchema,
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },
  reactions: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      emoji: {
        type: String,
        required: true,
      },
    },
  ],
  editedAt: {
    type: Date,
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
},{
  timestamps:true,
})

messageSchema.index({conversationId:1, createdAt: -1});
messageSchema.index({conversationId:1, content: "text"});

const Message = mongoose.model('Message',messageSchema);

export default Message;
