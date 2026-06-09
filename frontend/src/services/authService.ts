import api from '@/lib/axios'

export const authService ={
  signUp: async (username: string, password: string, email: string, lastname: string, firstname: string) =>{
    const res = await api.post('/auth/signup', {
      username,
      password,
      email,
      lastName: lastname,
      firstName: firstname
    }, {withCredentials: true});
    return res.data;
  },

  signIn: async (username: string, password:string) =>{
    const res = await api.post('/auth/signin',{
      username,
      password
    }, {withCredentials: true});
    return res.data; // access token
  },

  signOut: async ()=>{
    return api.post("/auth/signout",{},{ withCredentials: true});
  },

  fetchMe: async () => {
    const res = await api.get("/users/me", {withCredentials: true});
    return res.data.user
  },

  refresh: async () => {
    const res = await api.post("/auth/refresh",{ withCredentials: true}  )
    return res.data.accessToken;
  }
}
