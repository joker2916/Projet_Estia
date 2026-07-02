import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginProfessor } from "../api/portals";
import { AuthShell } from "./StudentLogin";

function ProfessorLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const res = await loginProfessor(username, password);
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("studentToken");
      localStorage.removeItem("studentName");
      localStorage.setItem("professorToken", res.data.token);
      localStorage.setItem("professorName", res.data.username);
      navigate("/professor");
    } catch {
      setError("Identifiants professeur invalides.");
    }
  };

  return (
    <AuthShell
      title="Espace Professeur"
      subtitle="Assiduite et points de comportement de vos promotions"
    >
      <form onSubmit={handleSubmit} style={formStyle}>
        {error && <div style={errorStyle}>{error}</div>}
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nom utilisateur"
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

export default ProfessorLogin;
