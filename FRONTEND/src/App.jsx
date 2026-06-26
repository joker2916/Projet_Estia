import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cards from "./pages/Cards";
import Attendance from "./pages/Attendance";
import Settings from "./pages/Settings";
import Academics from "./pages/Academics";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
