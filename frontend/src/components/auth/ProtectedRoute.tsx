import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect,useState } from 'react';
import { Navigate, Outlet } from 'react-router';


  const ProtectedRoute = () => {
    const {accessToken, refresh, loading} = useAuthStore();
    const [starting, setStarting] = useState(true);

    const init = async () =>{
      // có thể xảy ra khi refresh trang
        if(!useAuthStore.getState().accessToken){
           await refresh();
        }

        const {accessToken: currentToken, fetchMe} = useAuthStore.getState();
        if(currentToken){
          await fetchMe();
        }
        setStarting(false);
    }

    useEffect(()=>{
      init()
    },[])

    if(starting || loading){
      return <div className='flex h-screen items-center justify-center'>Đang tải trang...</div>
    }

    if(!accessToken) {
      return(
        <Navigate
        to="/signin"
        replace
        
        />
      )
    }
    return (
      <Outlet></Outlet>
    )
  }


export default ProtectedRoute;
