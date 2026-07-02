import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginStudent } from "../api/portals";

function StudentLogin() {
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const res = await loginStudent(matricule, password);
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("professorToken");
      localStorage.removeItem("professorName");
      localStorage.setItem("studentToken", res.data.token);
      localStorage.setItem("studentName", res.data.student_name);
      navigate("/student");
    } catch {
      setError("Identifiants étudiant invalides ou inscription inactive.");
    }
  };

  return (
    <AuthShell title="Espace Étudiant" subtitle="Solde et assiduité par année académique">
      <form onSubmit={handleSubmit} style={formStyle}>
        {error && <div style={errorStyle}>{error}</div>}
        <input
          value={matricule}
          onChange={(e) => setMatricule(e.target.value)}
          placeholder="Matricule"
          required
          style={inputStyle}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          required
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>
          Se connecter
        </button>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children, onLogout }) {
  const isLoginShell = !onLogout;
  return (
    <div style={{ ...shellStyle, ...(isLoginShell ? loginShellStyle : {}) }}>
      <div style={{ ...pageStyle, ...(isLoginShell ? loginPageStyle : {}) }}>
        <div style={headerRow}>
          <div>
            <h1 style={{ margin: "0 0 6px", color: "#1976d2" }}>{title}</h1>
            {subtitle && <p style={{ margin: 0, color: "#666" }}>{subtitle}</p>}
          </div>
          {onLogout && (
            <button type="button" onClick={onLogout} style={logoutStyle}>
              Deconnexion
            </button>
          )}
        </div>
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
}

export function PeriodFilter({ filters, setFilters }) {
  return (
    <div style={filterStyle}>
      <input
        type="date"
        value={filters.start_date}
        onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
        style={inputStyle}
      />
      <input
        type="date"
        value={filters.end_date}
        onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
        style={inputStyle}
      />
    </div>
  );
}

export function Metric({ label, value }) {
  return (
    <div style={metricStyle}>
      <span style={{ color: "#666", fontSize: "13px" }}>{label}</span>
      <strong style={{ fontSize: "22px", color: "#1976d2" }}>{value}</strong>
    </div>
  );
}

const shellStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #1565c0, #42a5f5)",
  padding: "28px",
};
const pageStyle = {
  maxWidth: "980px",
  margin: "0 auto",
};
const loginShellStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const loginPageStyle = {
  maxWidth: "420px",
  width: "100%",
};
const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
  color: "white",
};
const logoutStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#c62828",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};
const contentStyle = {
  backgroundColor: "white",
  borderRadius: "14px",
  padding: "24px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
};
const filterStyle = { display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" };
const metricStyle = {
  display: "grid",
  gap: "6px",
  padding: "14px",
  borderRadius: "10px",
  backgroundColor: "#f5f9ff",
};
const formStyle = { display: "grid", gap: "12px" };
const inputStyle = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "15px",
};
const buttonStyle = {
  padding: "12px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#1976d2",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};
const errorStyle = {
  padding: "10px",
  borderRadius: "8px",
  backgroundColor: "#ffebee",
  color: "#c62828",
};

export default StudentLogin;
