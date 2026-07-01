import { HashRouter, Route, Routes } from 'react-router'
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChatAppPage from './pages/ChatAppPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import {Toaster} from 'sonner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import AdminPage from './pages/AdminPage';
function App() {
  

  return (
    <>
    <Toaster richColors/>
     <HashRouter>
     <Routes>
      {/* public routes */}
      <Route
      path='/signin'
      element={<SignInPage/>}
      />
      <Route
      path='/signup'
      element={<SignUpPage/>}
      />
      <Route
      path='/forgot-password'
      element={<ForgotPasswordPage/>}
      />
      <Route
      path='/reset-password'
      element={<ResetPasswordPage/>}
      />
      {/* protected routes */}
      {/* todo tạo protected route */}
      <Route element={<ProtectedRoute />}>
        <Route path='/' element={<ChatAppPage />} />
        <Route path='/feed' element={<FeedPage />} />
        <Route path='/profile/:userId' element={<ProfilePage />} />
        <Route path='/profile' element={<ProfilePage />} />
        <Route element={<AdminRoute />}>
          <Route path='/admin' element={<AdminPage />} />
        </Route>
      </Route>
     </Routes>
     </HashRouter>
    </>
  )
}

export default App;
