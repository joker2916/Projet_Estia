import { useState, useEffect, useCallback } from "react";
import { getAccessEvents, getAttendanceLookups } from "../api/attendance";
import PageHeader from "../components/PageHeader";
import ContentCard from "../components/ContentCard";

function Attendance() {
  const [events, setEvents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    count: 0,
    numPages: 1,
  });
  const [filters, setFilters] = useState({
    result: "",
    reason: "",
    faculty_id: "",
    promotion_id: "",
    academic_year_id: "",
  });

  const updateFilters = (changes) => {
    setFilters((current) => ({ ...current, ...changes }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const fetchAccessEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = {};
    if (filters.result) params.result = filters.result;
    if (filters.reason) params.reason = filters.reason;
    if (filters.faculty_id) params.faculty_id = filters.faculty_id;
    if (filters.promotion_id) params.promotion_id = filters.promotion_id;
    if (filters.academic_year_id)
      params.academic_year_id = filters.academic_year_id;
    params.page = pagination.page;
    params.page_size = pagination.pageSize;

    try {
      const res = await getAccessEvents(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setEvents(data);
        setPagination((current) => ({
          ...current,
          count: data.length,
          numPages: 1,
        }));
      } else {
        setEvents(data.results || []);
        setPagination((current) => ({
          ...current,
          count: data.count || 0,
          numPages: data.num_pages || 1,
        }));
      }
    } catch {
      setError("Impossible de charger le journal d'acces.");
    } finally {
      setLoading(false);
    }
  }, [
    filters.result,
    filters.reason,
    filters.faculty_id,
    filters.promotion_id,
    filters.academic_year_id,
    pagination.page,
    pagination.pageSize,
  ]);

  const fetchLookups = async () => {
    const lookups = await getAttendanceLookups();
    const [fRes, pRes, yRes] = lookups;
    setFaculties(fRes.data);
    setPromotions(pRes.data);
    setYears(yRes.data);
  };

  useEffect(() => {
    fetchLookups();
  }, []);

  useEffect(() => {
    fetchAccessEvents();
  }, [fetchAccessEvents]);

  return (
    <div>
      <PageHeader
        title="Journal des Acces"
        subtitle="Suivi des evenements d'acces RFID enregistres au portique."
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
          onChange={(e) => updateFilters({ result: e.target.value })}
          style={inputStyle}
        >
          <option value="">Tous les resultats</option>
          <option value="allowed">Autorises</option>
          <option value="denied">Refuses</option>
        </select>

        <select
          value={filters.reason}
          onChange={(e) => updateFilters({ reason: e.target.value })}
          style={inputStyle}
        >
          <option value="">Tous les motifs</option>
          <option value="unknown_card">Carte inconnue</option>
          <option value="disabled_card">Carte desactivee</option>
          <option value="expired_card">Carte expiree</option>
          <option value="lost_card">Carte perdue</option>
          <option value="unpaid_fees">Frais impayes</option>
          <option value="outside_schedule">Hors horaire</option>
          <option value="outside_course_period">Hors periode de cours</option>
          <option value="inactive_enrollment">Inscription inactive</option>
          <option value="enrollment_mismatch">Incoherence academique</option>
        </select>

        <select
          value={filters.faculty_id}
          onChange={(e) =>
            updateFilters({
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
          onChange={(e) => updateFilters({ promotion_id: e.target.value })}
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
          onChange={(e) => updateFilters({ academic_year_id: e.target.value })}
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
        Total : {pagination.count} evenement(s)
      </ContentCard>

      {error && <p style={{ color: "#c62828" }}>{error}</p>}
      {loading && <p>Chargement du journal...</p>}

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
                <td style={tdStyle}>
                  {(pagination.page - 1) * pagination.pageSize + index + 1}
                </td>
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

      <div style={paginationStyle}>
        <button
          onClick={() =>
            setPagination((current) => ({
              ...current,
              page: Math.max(current.page - 1, 1),
            }))
          }
          disabled={pagination.page <= 1 || loading}
          style={buttonStyle}
        >
          Precedent
        </button>
        <span>
          Page {pagination.page} / {pagination.numPages || 1}
        </span>
        <button
          onClick={() =>
            setPagination((current) => ({
              ...current,
              page: Math.min(current.page + 1, current.numPages || 1),
            }))
          }
          disabled={pagination.page >= pagination.numPages || loading}
          style={buttonStyle}
        >
          Suivant
        </button>
      </div>

      {!loading && events.length === 0 && (
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
const paginationStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "12px",
  marginTop: "16px",
};
const buttonStyle = {
  padding: "8px 14px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  cursor: "pointer",
};

export default Attendance;
