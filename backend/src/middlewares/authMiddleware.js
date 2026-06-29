import jwt from 'jsonwebtoken';
import User from '../models/user.js';

// authorization - xác minh user là ai
export const protectedRoute = (req,res,next) =>{
  try{
    // Lấy token từ header
    const authHeader = req.header('authorization');
    const token = authHeader && authHeader.split(' ')[1]; // Bearer token

    if(!token){
      return res.status(401).json({message:'Không tìm thấy access token'})
    }
    // Xác nhận token hợp lệ
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded)=>{
      if(err){
        console.log(err);

        return res.status(403).json({message:'access token hết hạn hoặc không đúng'});
      }
      // Tìm user
      const user = await User.findById(decoded.userId).select('-hashedPassword');
      if(!user){
        return res.status(404).json({message:'Người dùng không tồn tại'});
      }
    // Trả user về trong req
      if(user.isActive === false){
        return res.status(403).json({message:'Tai khoan da bi khoa'});
      }
      req.user = user;
      next();

    })
    
  }catch(error){
    console.log('Lỗi khi xác minh jwt trong authMiddleware',error);
    return res.status(500).json({message:'lỗi hệ thống'});
  
  }
}

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ban khong co quyen quan tri" });
  }

  return next();
};

const ADMIN_PERMISSIONS = {
  super_admin: ["*"],
  moderator: ["dashboard", "users", "messages", "groups", "reports", "media"],
  support: ["dashboard", "users"],
};

export const requireAdminPermission = (permission) => (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Ban khong co quyen quan tri" });
  }

  const adminRole = req.user.adminRole || "super_admin";
  const permissions = ADMIN_PERMISSIONS[adminRole] || [];

  if (!permissions.includes("*") && !permissions.includes(permission)) {
    return res.status(403).json({ message: "Vai tro admin khong co quyen nay" });
  }

  return next();
};
