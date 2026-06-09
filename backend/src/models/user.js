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
  }
},{
  timestamps:true,
}
);

const User = mongoose.model('User', schema);
export default User;
