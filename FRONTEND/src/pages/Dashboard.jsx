import { useState, useEffect } from "react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import ContentCard from "../components/ContentCard";

function Dashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    total_faculties: 0,
    total_promotions: 0,
    total_cards: 0,
    active_cards: 0,
    disabled_cards: 0,
    expired_cards: 0,
    assigned_cards: 0,
    unassigned_cards: 0,
    allowed_today: 0,
    denied_today: 0,
    denied_unpaid_today: 0,
    denied_disabled_today: 0,
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
      <PageHeader
        title="Tableau de Bord"
        subtitle="Vue globale des indicateurs académiques, cartes RFID et accès."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginTop: "30px",
        }}
      >
        <StatCard
          title="Etudiants"
          value={stats.total_students}
          color="#1976d2"
        />
        <StatCard
          title="Facultes"
          value={stats.total_faculties}
          color="#8e24aa"
        />
        <StatCard
          title="Promotions"
          value={stats.total_promotions}
          color="#3949ab"
        />
        <StatCard
          title="Cartes Total"
          value={stats.total_cards}
          color="#ff9800"
        />
        <StatCard
          title="Cartes Actives"
          value={stats.active_cards}
          color="#2e7d32"
        />
        <StatCard
          title="Cartes Desactivees"
          value={stats.disabled_cards}
          color="#d32f2f"
        />
        <StatCard
          title="Cartes Expirees"
          value={stats.expired_cards}
          color="#6d4c41"
        />
        <StatCard
          title="Cartes Assignees"
          value={stats.assigned_cards}
          color="#4caf50"
        />
        <StatCard
          title="Cartes Non Assignees"
          value={stats.unassigned_cards}
          color="#9c27b0"
        />
      </div>

      <div
        style={{
          marginTop: "30px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
        }}
      >
        <StatCard
          title="Acces Autorises (aujourd'hui)"
          value={stats.allowed_today}
          color="#2e7d32"
        />
        <StatCard
          title="Acces Refuses (aujourd'hui)"
          value={stats.denied_today}
          color="#d32f2f"
        />
        <StatCard
          title="Refus Impayes"
          value={stats.denied_unpaid_today}
          color="#ef6c00"
        />
        <StatCard
          title="Refus Carte Desactivee"
          value={stats.denied_disabled_today}
          color="#5d4037"
        />
      </div>

      <ContentCard
        padding="30px"
        style={{
          marginTop: "30px",
          borderRadius: "15px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h2>Centre de supervision RFID</h2>
        <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.8" }}>
          Ce tableau de bord agrege les informations academiques et les
          evenements d'acces.
          <br />
          <strong>Structure academique</strong> : Facultes, promotions et annees
          academiques
          <br />
          <strong>Cartes RFID</strong> : suivi des statuts, usages et
          affectations
          <br />
          <strong>Acces journalier</strong> : autorisations, refus et motifs
          metier
          <br />
          <strong>Objectif</strong> : supervision centralisee pour une
          universite multi-facultes
        </p>
      </ContentCard>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "15px",
        padding: "25px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderLeft: `5px solid ${color}`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "40px" }}>{icon}</div>
      <h3 style={{ color: "#333", marginTop: "10px" }}>{title}</h3>
      <p
        style={{
          fontSize: "36px",
          fontWeight: "bold",
          color,
          margin: "10px 0 0",
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default Dashboard;
