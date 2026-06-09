import bcrypt from 'bcrypt';
import User from '../models/user.js';
import Session from '../models/Session.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
    return res.sendStatus(204)
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
      return res.status(401).json({message:"username hoặc password không chính xác"})
    }

    //kiểm tra password
    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if(!passwordCorrect){
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
    //trả refesh Token về trong cookie
    res.cookie('refreshToken',refreshToken,{
      httpOnly:true,
      secure:true,
      sameSite: 'none', //backend và frontend deloy riêng
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
    res.clearCookie('refreshToken')
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
