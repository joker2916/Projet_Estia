import { useState, useEffect } from "react";
import api from "../api/axios";

function Dashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_cards: 0,
    assigned_cards: 0,
    unassigned_cards: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("dashboard/");
        setStats(res.data);
      } catch (err) {
        console.error("Erreur chargement dashboard:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <h1> Tableau de Bord</h1>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
        marginTop: "30px",
      }}>
        <StatCard title="Étudiants" value={stats.total_students} color="#1976d2" />
        <StatCard title="Cartes RFID" value={stats.total_cards} color="#ff9800" />
        <StatCard title="Cartes Assignées" value={stats.assigned_cards} color="#4caf50" />
        <StatCard title="Cartes Non Assignées" value={stats.unassigned_cards} color="#9c27b0" />
      </div>

      <div style={{
        marginTop: "40px",
        backgroundColor: "white",
        padding: "30px",
        borderRadius: "15px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}>
        <h2> Bienvenue sur le système de pointage RFID</h2>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.8" }}>
          Ce système permet de gérer les présences des étudiants via des cartes RFID.
          <br />
           <strong>Ajoutez des étudiants</strong> dans la section Étudiants
          <br />
           <strong>Enregistrez des cartes RFID</strong> et assignez-les aux étudiants
          <br />
           <strong>Consultez les présences</strong> enregistrées automatiquement
          <br />
           <strong>Connectez l'ESP32</strong> pour scanner les cartes en temps réel
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "15px",
      padding: "25px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      borderLeft: `5px solid ${color}`,
      textAlign: "center",
    }}>
      <div style={{ fontSize: "40px" }}>{icon}</div>
      <h3 style={{ color: "#333", marginTop: "10px" }}>{title}</h3>
      <p style={{ fontSize: "36px", fontWeight: "bold", color, margin: "10px 0 0" }}>{value}</p>
    </div>
  );
}

export default Dashboard;