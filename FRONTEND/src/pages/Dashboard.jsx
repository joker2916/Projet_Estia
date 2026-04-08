import { useState, useEffect } from "react";
import api from "../api/axios";

function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    cards: 0,
    attendance_today: 0,
    total_attendance: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [students, cards, attendance] = await Promise.all([
          api.get("students/"),
          api.get("cards/"),
          api.get("attendance/"),
        ]);

        const today = new Date().toISOString().split("T")[0];
        const todayAttendance = attendance.data.filter((a) => a.date === today);

        setStats({
          students: students.data.length,
          cards: cards.data.length,
          attendance_today: todayAttendance.length,
          total_attendance: attendance.data.length,
        });
      } catch (err) {
        console.error(err);
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
        <StatCard  title="Étudiants" value={stats.students} color="#1976d2" />
        <StatCard  title="Cartes RFID" value={stats.cards} color="#ff9800" />
        <StatCard  title="Présences aujourd'hui" value={stats.attendance_today} color="#4caf50" />
        <StatCard  title="Total présences" value={stats.total_attendance} color="#9c27b0" />
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
