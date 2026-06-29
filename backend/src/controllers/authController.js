import bcrypt from 'bcrypt';
import User from '../models/user.js';
import Session from '../models/Session.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import LoginLog from '../models/LoginLog.js';
import PasswordReset from '../models/PasswordReset.js';
const isProduction = process.env.NODE_ENV === 'production';
const refreshCookieOptions = {
  httpOnly:true,
  secure:isProduction,
  sameSite: isProduction ? 'none' : 'lax',
};
const ACCESS_TOKEN_TTL='15m'; //thường là dưới 15m
const REFRESH_TOKEN_TTL=14*24*60*60*1000; //14 ngày tính bằng ms

export const signUp = async (req, res) =>{
  try{
     const {username,password,email,firstName,lastName}=req.body;

     if(!username || !password || !email || !firstName || !lastName){
      return res.status(400).json({message:"không thể thiếu username,password,email,firstName,lastName"})
     }

     // kiểm tra username có tồn tại không
    const duplicate =await User.findOne({username});

    if(duplicate){
      return res.status(409).json({message:"username đã tồn tại"})
    }
    // mã hóa password
    const hashedPassword = await bcrypt.hash(password,10); //salt =10
    // tạo user mới
    await User.create({
      username,
      hashedPassword: hashedPassword,
      email,
      displayName:`${lastName} ${firstName}`
    })
    //return 
    return res.status(201).json({message:"Tao tai khoan thanh cong"})
  }catch(error){
    console.error("Lỗi khi gọi signUp",error);
    return res.status(500).json({message:"Lỗi hệ thống"})
  }
};

export const signIn = async (req, res) =>{

  try{
    // lấy inputs
    const {username,password}=req.body;

    if(!username || !password){
      return res.status(400).json({message:"Thiếu username hoặc password"})
    }

    //lấy hashedpassword trong db so sánh với input
    const user= await User.findOne({username});
    if(!user){
      await LoginLog.create({
        identity: username,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: false,
        reason: "invalid_credentials",
      });
      return res.status(401).json({message:"username hoặc password không chính xác"})
    }

    //kiểm tra password
    if(user.isActive === false){
      await LoginLog.create({
        userId: user._id,
        identity: username,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: false,
        reason: "account_locked",
      });
      return res.status(403).json({message:"Tai khoan cua ban da bi khoa"})
    }

    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if(!passwordCorrect){
      await LoginLog.create({
        userId: user._id,
        identity: username,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: false,
        reason: "invalid_credentials",
      });
      return res.status(401).json({message:"username hoặc password không chính xác"})
    }

    //nếu giống thì tạo accessToken với JWT
    const accessToken =jwt.sign({userId:user._id},process.env.ACCESS_TOKEN_SECRET,
      {expiresIn: ACCESS_TOKEN_TTL})
    //tạo refesh token
      const refreshToken = crypto.randomBytes(64).toString('hex');


    //tạo session mới để lưu accessToken
      await Session.create({
        userId:user._id,
        refreshToken,
        expiresAt:new Date(Date.now() + REFRESH_TOKEN_TTL),
      })
      await LoginLog.create({
        userId: user._id,
        identity: username,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        success: true,
        reason: "signed_in",
      });
    //trả refesh Token về trong cookie
    res.cookie('refreshToken',refreshToken,{
      ...refreshCookieOptions,
      maxAge:REFRESH_TOKEN_TTL,
    })

    //trả access token về trong res
    return res.status(200).json({message:`User ${user.displayName} đã login thành công`, accessToken})

  }catch(error){
    console.error("Lỗi khi gọi signIn",error);
    return res.status(500).json({message:"Lỗi hệ thống",error:error.message})
  }

}

export const signOut = async (req, res) =>{
  try{
    // lấy refresh token từ cookie
    const token =req.cookies?.refreshToken;

    if(token){
      // xóa refresh token trong session
      await Session.deleteOne({refreshToken: token})
    // xóa cookie
    res.clearCookie('refreshToken', refreshCookieOptions)
    }
    
    return res.sendStatus(204)
  }catch(error){
     console.error("Lỗi khi gọi signOut",error);
    return res.status(500).json({message:"Lỗi hệ thống",error:error.message})
  }
}

// Tạo access token mới từ refresh token
export const refresh = async (req,res) =>{
  try{
    //lấy refresh token từ cookie
    const token= req.cookies?.refreshToken;

    if(!token){
      return res.status(401).json({message:'token không tồn tại'})
    }
    //so với refresh token trong db
    const session = await Session.findOne({refreshToken:token});

    if(!session){
      return res.status(403).json({message:'token không hợp lệ hoặc đã hết hạn'})
    } 
    //kiểm tra hết hạn chưa
    if(session.expiresAt < new Date()){
      return res.status(403).json({message:'Token đã hết hạn'})
    }
    //tạo access token mới
    const user = await User.findById(session.userId).select("isActive");
    if(!user || user.isActive === false){
      await Session.deleteMany({userId: session.userId});
      res.clearCookie('refreshToken', refreshCookieOptions);
      return res.status(403).json({message:'Tai khoan khong ton tai hoac da bi khoa'})
    }

    const accessToken =jwt.sign({
      userId: session.userId
    }, process.env.ACCESS_TOKEN_SECRET,{expiresIn:ACCESS_TOKEN_TTL});
    //return
    return res.status(200).json({accessToken})
  }catch(error){
    console.error('Lỗi khi gọi refreshToken',error);
    return res.status(500).json({message:'Lỗi hệ thống'})
  }
}

// Đổi mật khẩu (user đã đăng nhập)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Can nhap mat khau hien tai va mat khau moi' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mat khau moi phai co it nhat 6 ky tu' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Mat khau moi khong duoc trung voi mat khau hien tai' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Nguoi dung khong ton tai' });
    }

    const passwordCorrect = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!passwordCorrect) {
      return res.status(401).json({ message: 'Mat khau hien tai khong chinh xac' });
    }

    user.hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Xóa tất cả session khác (buộc đăng nhập lại trên các thiết bị khác)
    const currentRefreshToken = req.cookies?.refreshToken;
    if (currentRefreshToken) {
      await Session.deleteMany({
        userId,
        refreshToken: { $ne: currentRefreshToken },
      });
    }

    return res.status(200).json({ message: 'Doi mat khau thanh cong' });
  } catch (error) {
    console.error('Loi khi doi mat khau', error);
    return res.status(500).json({ message: 'Loi he thong' });
  }
};

// Quên mật khẩu - gửi email reset
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Vui long nhap email' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Luôn trả 200 để tránh lộ thông tin email có tồn tại hay không
    if (!user) {
      return res.status(200).json({ message: 'Neu email ton tai, chung toi se gui link dat lai mat khau' });
    }

    if (user.isActive === false) {
      return res.status(200).json({ message: 'Neu email ton tai, chung toi se gui link dat lai mat khau' });
    }

    // Xóa các token cũ của user này
    await PasswordReset.deleteMany({ userId: user._id });

    // Tạo token reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await PasswordReset.create({
      userId: user._id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 giờ
    });

    // Gửi email
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: 'Moji - Dat lai mat khau',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Moji Chat</h2>
          <p>Xin chao <strong>${user.displayName}</strong>,</p>
          <p>Chung toi nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban.</p>
          <p>Nhan vao nut ben duoi de dat lai mat khau:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">Dat lai mat khau</a>
          </div>
          <p style="color: #666; font-size: 14px;">Link nay se het han sau <strong>1 gio</strong>.</p>
          <p style="color: #666; font-size: 14px;">Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Moji Chat App</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'Neu email ton tai, chung toi se gui link dat lai mat khau' });
  } catch (error) {
    console.error('Loi khi gui email dat lai mat khau', error);
    return res.status(500).json({ message: 'Loi he thong. Vui long thu lai sau' });
  }
};

// Đặt lại mật khẩu bằng token
export const resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({ message: 'Thieu thong tin dat lai mat khau' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mat khau moi phai co it nhat 6 ky tu' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await PasswordReset.findOne({
      token: hashedToken,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Link dat lai mat khau khong hop le hoac da het han' });
    }

    const user = await User.findById(resetRecord.userId);
    if (!user || user.email.toLowerCase() !== email.toLowerCase().trim()) {
      return res.status(400).json({ message: 'Link dat lai mat khau khong hop le' });
    }

    user.hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Xóa tất cả token reset và session cũ
    await Promise.all([
      PasswordReset.deleteMany({ userId: user._id }),
      Session.deleteMany({ userId: user._id }),
    ]);

    return res.status(200).json({ message: 'Dat lai mat khau thanh cong. Vui long dang nhap lai' });
  } catch (error) {
    console.error('Loi khi dat lai mat khau', error);
    return res.status(500).json({ message: 'Loi he thong' });
  }
};
