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

export function AuthShell({ title, subtitle, children }) {
  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, color: "#1976d2" }}>{title}</h1>
        <p style={{ color: "#666" }}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

const shellStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #1565c0, #42a5f5)",
};
const cardStyle = {
  width: "420px",
  backgroundColor: "white",
  borderRadius: "14px",
  padding: "32px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
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
