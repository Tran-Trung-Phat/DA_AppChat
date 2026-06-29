import { BrowserRouter, Route, Routes } from 'react-router'
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ChatAppPage from './pages/ChatAppPage';
import {Toaster} from 'sonner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import AdminPage from './pages/AdminPage';
function App() {
  

  return (
    <>
    <Toaster richColors/>
     <BrowserRouter>
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
      {/* protected routes */}
      {/* todo tạo protected route */}
      <Route element={<ProtectedRoute />}>
        <Route path='/' element={<ChatAppPage />} />
        <Route element={<AdminRoute />}>
          <Route path='/admin' element={<AdminPage />} />
        </Route>
      </Route>
     </Routes>
     </BrowserRouter>
    </>
  )
}

export default App;
