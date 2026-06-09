import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './libs/db.js';
import authRouter from './routes/authRouter.js';
import userRouter from './routes/userRouter.js';
import friendRoute from './routes/friendRoute.js';
import messageRoute from './routes/messageRoute.js';
import conversationRoute from './routes/conversationRoute.js';
import cookieParser from 'cookie-parser';
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log("ENV TEST:", process.env.MONGODB_CONNECTIONSTRING);
console.log(process.env.MONGODB_CONNECTIONSTRING);

const app = express();
const PORT =process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: process.env.CLIENT_URL, credentials: true}))
// public routes
app.use('/api/auth',authRouter);
// private routes
app.use(protectedRoute);
app.use('/api/users', userRouter);
app.use('/api/friends',friendRoute);
app.use('/api/messages',messageRoute);
app.use('/api/conversations', conversationRoute);


connectDB().then(() =>{
  app.listen(PORT,()=>{
  console.log(`Server bắt đầu trên cổng ${PORT}`);
})
});
