import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";

const AdminRoute = () => {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
