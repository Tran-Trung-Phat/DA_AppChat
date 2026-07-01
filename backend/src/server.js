import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './libs/db.js';
import authRouter from './routes/authRouter.js';
import userRouter from './routes/userRouter.js';
import friendRoute from './routes/friendRoute.js';
import messageRoute from './routes/messageRoute.js';
import conversationRoute from './routes/conversationRoute.js';
import adminRoute from './routes/adminRoute.js';
import storyRoute from './routes/storyRoute.js';
import cookieParser from 'cookie-parser';
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';
import { initSocket } from './libs/socket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const PORT =process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL
  ? (process.env.CLIENT_URL.includes(",") ? process.env.CLIENT_URL.split(",").map(url => url.trim()) : process.env.CLIENT_URL)
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://appchat-frontend-lzyt.onrender.com',
    ];
initSocket(server);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: CLIENT_URL, credentials: true}))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// public routes
app.use('/api/auth',authRouter);
// private routes
app.use(protectedRoute);
app.use('/api/users', userRouter);
app.use('/api/friends',friendRoute);
app.use('/api/messages',messageRoute);
app.use('/api/conversations', conversationRoute);
app.use('/api/admin', adminRoute);
app.use('/api/stories', storyRoute);


connectDB().then(() =>{
  server.listen(PORT,()=>{
  console.log(`Server bắt đầu trên cổng ${PORT}`);
})
});
