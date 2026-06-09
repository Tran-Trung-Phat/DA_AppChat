import { useAuthStore } from '@/stores/useAuthStore';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.MODE === 'development' ? 'http://localhost:5001/api' : '/api',
  withCredentials: true,
})

//Gắn access Token vào req header
api.interceptors.request.use((config)=>{
  const {accessToken} = useAuthStore.getState();

  if(accessToken){
    config.headers.Authorization = `Bearer ${accessToken}`;
  
  }
  return config;
});

//Tự động gọi refresh api khi access token hết hạn
api.interceptors.response.use((res)=> res, async (error) =>{
  const originaRequest = error.config;

  //Những api không cần check
  if(
    originaRequest.url.includes("/auth/signin") ||
    originaRequest.url.includes("/auth/signup") ||
    originaRequest.url.includes("/auth/refresh") 
  ) {
      originaRequest._retryCount= originaRequest._retryCount || 0;
      return Promise.reject(error);
     }
     if(error.response?.status === 403 && originaRequest._retryCount < 4){
      originaRequest._retryCount += 1;
      console.log('refresh',originaRequest._retryCount);
      try{
        const res = await api.post("/auth/refresh",{withCredentials: true});
        const newAccessToken = res.data.accessToken;

        useAuthStore.getState().setAccessToken(newAccessToken)

        originaRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originaRequest);
        
      }catch(refreshError){
        useAuthStore.getState().clearState();
        return Promise.reject(refreshError);
      }
     }

     return Promise.reject(error);
  
})


export default api;