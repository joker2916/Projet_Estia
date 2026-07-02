import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cards from "./pages/Cards";
import Attendance from "./pages/Attendance";
import Settings from "./pages/Settings";
import Academics from "./pages/Academics";
import StudentLogin from "./pages/StudentLogin";
import StudentPortal from "./pages/StudentPortal";
import ProfessorLogin from "./pages/ProfessorLogin";
import ProfessorPortal from "./pages/ProfessorPortal";

function PrivateRoute({ children }) {
  const professorToken = localStorage.getItem("professorToken");
  const studentToken = localStorage.getItem("studentToken");
  const token = localStorage.getItem("token");

  if (professorToken) {
    return <Navigate to="/professor" replace />;
  }
  if (studentToken) {
    return <Navigate to="/student" replace />;
  }
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student" element={<StudentPortal />} />
      <Route path="/professor/login" element={<ProfessorLogin />} />
      <Route path="/professor" element={<ProfessorPortal />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="academics" element={<Academics />} />
        <Route path="students" element={<Navigate to="/academics" replace />} />
        <Route path="cards" element={<Cards />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
