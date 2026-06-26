import { useState, useEffect } from "react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import ContentCard from "../components/ContentCard";

function Attendance() {
  const [events, setEvents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({
    result: "",
    reason: "",
    faculty_id: "",
    promotion_id: "",
    academic_year_id: "",
  });
  const fetchAccessEvents = async () => {
    const params = {};
    if (filters.result) params.result = filters.result;
    if (filters.reason) params.reason = filters.reason;
    if (filters.faculty_id) params.faculty_id = filters.faculty_id;
    if (filters.promotion_id) params.promotion_id = filters.promotion_id;
    if (filters.academic_year_id)
      params.academic_year_id = filters.academic_year_id;

    const res = await api.get("access-events/", { params });
    setEvents(res.data);
  };

  const fetchLookups = async () => {
    const [fRes, pRes, yRes] = await Promise.all([
      api.get("faculties/", { params: { status: "active" } }),
      api.get("promotions/", { params: { status: "active" } }),
      api.get("academic-years/"),
    ]);
    setFaculties(fRes.data);
    setPromotions(pRes.data);
    setYears(yRes.data);
  };

  useEffect(() => {
    fetchLookups();
    fetchAccessEvents();
  }, [
    filters.result,
    filters.reason,
    filters.faculty_id,
    filters.promotion_id,
    filters.academic_year_id,
  ]);

  return (
    <div>
      <PageHeader
        title="Journal des Acces"
        subtitle="Suivi des événements d'accès autorisés ou refusés avec motifs."
      />

      <ContentCard
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <select
          value={filters.result}
          onChange={(e) => setFilters({ ...filters, result: e.target.value })}
          style={inputStyle}
        >
          <option value="">Tous les resultats</option>
          <option value="allowed">Autorises</option>
          <option value="denied">Refuses</option>
        </select>

        <select
          value={filters.reason}
          onChange={(e) => setFilters({ ...filters, reason: e.target.value })}
          style={inputStyle}
        >
          <option value="">Tous les motifs</option>
          <option value="unknown_card">Carte inconnue</option>
          <option value="disabled_card">Carte desactivee</option>
          <option value="expired_card">Carte expiree</option>
          <option value="lost_card">Carte perdue</option>
          <option value="unpaid_fees">Frais impayes</option>
          <option value="outside_schedule">Hors horaire</option>
          <option value="inactive_enrollment">Inscription inactive</option>
        </select>

        <select
          value={filters.faculty_id}
          onChange={(e) =>
            setFilters({
              ...filters,
              faculty_id: e.target.value,
              promotion_id: "",
            })
          }
          style={inputStyle}
        >
          <option value="">Toutes les facultes</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <select
          value={filters.promotion_id}
          onChange={(e) =>
            setFilters({ ...filters, promotion_id: e.target.value })
          }
          style={inputStyle}
        >
          <option value="">Toutes les promotions</option>
          {promotions
            .filter(
              (p) =>
                !filters.faculty_id ||
                String(p.faculty) === String(filters.faculty_id),
            )
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>

        <select
          value={filters.academic_year_id}
          onChange={(e) =>
            setFilters({ ...filters, academic_year_id: e.target.value })
          }
          style={inputStyle}
        >
          <option value="">Toutes les annees</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </ContentCard>

      <ContentCard
        style={{
          padding: "10px",
          marginBottom: "15px",
          textAlign: "center",
          fontSize: "18px",
          fontWeight: "bold",
          color: "#1976d2",
        }}
      >
        Total : {events.length} evenement(s)
      </ContentCard>

      <ContentCard padding="0" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#1976d2", color: "white" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Date/Heure</th>
              <th style={thStyle}>Etudiant</th>
              <th style={thStyle}>UID</th>
              <th style={thStyle}>Faculte</th>
              <th style={thStyle}>Promotion</th>
              <th style={thStyle}>Resultat</th>
              <th style={thStyle}>Motif</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, index) => (
              <tr key={ev.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{index + 1}</td>
                <td style={tdStyle}>
                  {new Date(ev.created_at).toLocaleString()}
                </td>
                <td style={tdStyle}>{ev.student_name || "-"}</td>
                <td style={tdStyle}>{ev.uid || "-"}</td>
                <td style={tdStyle}>{ev.faculty_name || "-"}</td>
                <td style={tdStyle}>{ev.promotion_name || "-"}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "20px",
                      backgroundColor:
                        ev.result === "allowed" ? "#4caf50" : "#f44336",
                      color: "white",
                      fontSize: "13px",
                    }}
                  >
                    {ev.result === "allowed" ? "Autorise" : "Refuse"}
                  </span>
                </td>
                <td style={tdStyle}>{ev.reason || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ContentCard>

      {events.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          Aucun evenement d'acces enregistre.
        </p>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "10px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  fontSize: "14px",
};
const thStyle = { padding: "12px", textAlign: "left" };
const tdStyle = { padding: "10px" };

export default Attendance;
