import "./App.css";
import Login from "./pages/Login.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import StudentPortal from "./components/portal/student/StudentPortal.jsx";
import AdminPortal from "./components/portal/admin/AdminPortal.jsx";
import FacultyPortal from "./components/portal/faculty/FacultyPortal.jsx";

const Role = {
  Admin: "admin",
  Faculty: "faculty",
  Student: "student",
};

export default function App() {
  const {
    user,
    loading: authLoading,
    logout,
    setUser: setAuthUser,
  } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading your workspace…</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.role === Role.Admin) {
    return <AdminPortal user={user} onLogout={logout} />;
  }

  if (user.role === Role.Faculty) {
    return <FacultyPortal user={user} onLogout={logout} />;
  }

  return (
    <StudentPortal user={user} onLogout={logout} setAuthUser={setAuthUser} />
  );
}
