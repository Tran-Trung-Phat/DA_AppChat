import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  username: {
    type: String,
    required:true,
    unique:true,
    trim:true,
    lowercase:true
  },
  hashedPassword: {
    type: String,
    required:true,
  },
  email: {
    type: String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true
  },
  displayName:{
    type: String,
    required:true,
    trim:true,
  },
  avatarUrl: {
    type: String, //Link CDN để hiển thị hình
  },
  avatarID: {
    type: String, //Claudinary public_id đẻ xóa hình ảnh
  },
  bio:{
    type: String,
    maxlength:500,
  },
  phone: {
    type: String,
    sparse:true, //cho phép null nhưng không được trùng
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  adminRole: {
    type: String,
    enum: ["super_admin", "moderator", "support"],
  },
  banReason: {
    type: String,
    default: "",
  },
  reportCount: {
    type: Number,
    default: 0,
  }
},{
  timestamps:true,
}
);

const User = mongoose.model('User', schema);
export default User;
