import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
    console.log('Liên kết csdl thành công');
  } catch (error) {
    console.error('Lỗi kết nối csdl:', error);
    process.exit(1);
  }
}