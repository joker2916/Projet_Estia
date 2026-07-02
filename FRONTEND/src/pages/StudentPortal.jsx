import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getStudentPortal } from "../api/portals";

function StudentPortal() {
  const token = localStorage.getItem("studentToken");
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ start_date: "", end_date: "" });
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    const loadReport = async () => {
      try {
        const res = await getStudentPortal(token, {
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        });
        if (!ignore) {
          setReport(res.data);
          setError("");
        }
      } catch {
        if (!ignore) {
          setError("Impossible de charger le rapport étudiant.");
        }
      }
    };

    loadReport();
    return () => {
      ignore = true;
    };
  }, [token, filters.start_date, filters.end_date]);

  if (!token) return <Navigate to="/student/login" />;

  const logout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("studentName");
    navigate("/student/login");
  };

  return (
    <PortalShell title="Espace Étudiant" onLogout={logout}>
      <PeriodFilter filters={filters} setFilters={setFilters} />
      {error && <p style={{ color: "#c62828" }}>{error}</p>}
      {report && (
        <>
          <h2>{report.student.name}</h2>
          <p>
            {report.enrollment.faculty} / {report.enrollment.promotion} /{" "}
            {report.enrollment.academic_year}
          </p>
          <p style={{ color: "#666", marginBottom: "16px" }}>
            Periode de validite : {report.enrollment.valid_from} →{" "}
            {report.enrollment.valid_to}
          </p>
          <div style={gridStyle}>
            <Metric label="Solde" value={`${report.financial.balance_due} USD`} />
            <Metric label="Jours attendus" value={report.summary.expected_days} />
            <Metric label="Présences" value={report.summary.present_days} />
            <Metric label="Retards" value={report.summary.late_count} />
            <Metric label="Absences" value={report.summary.absence_count} />
          </div>
          <h3>Absences</h3>
          <p>{report.absent_dates.length ? report.absent_dates.join(", ") : "Aucune absence sur la période."}</p>
          <EventsTable events={report.events} />
        </>
      )}
    </PortalShell>
  );
}

export function PortalShell({ title, children, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", padding: "28px" }}>
      <div style={headerStyle}>
        <h1>{title}</h1>
        <button onClick={onLogout} style={logoutStyle}>
          Déconnexion
        </button>
      </div>
      <div style={contentStyle}>{children}</div>
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
      <span style={{ color: "#666" }}>{label}</span>
      <strong style={{ fontSize: "24px", color: "#1976d2" }}>{value}</strong>
    </div>
  );
}

export function EventsTable({ events }) {
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Date</th>
          <th style={thStyle}>Résultat</th>
          <th style={thStyle}>Motif</th>
          <th style={thStyle}>UID</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td style={tdStyle}>{new Date(event.created_at).toLocaleString()}</td>
            <td style={tdStyle}>{event.result}</td>
            <td style={tdStyle}>{event.reason}</td>
            <td style={tdStyle}>{event.uid || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};
const logoutStyle = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#c62828",
  color: "white",
  cursor: "pointer",
};
const contentStyle = {
  backgroundColor: "white",
  borderRadius: "14px",
  padding: "24px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
};
const filterStyle = { display: "flex", gap: "10px", marginBottom: "18px" };
const inputStyle = { padding: "10px", border: "1px solid #ccc", borderRadius: "6px" };
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  margin: "20px 0",
};
const metricStyle = {
  display: "grid",
  gap: "8px",
  padding: "16px",
  borderRadius: "10px",
  backgroundColor: "#f5f9ff",
};
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: "12px" };
const thStyle = { textAlign: "left", padding: "10px", backgroundColor: "#f5f5f5" };
const tdStyle = { padding: "10px", borderBottom: "1px solid #eee" };

export default StudentPortal;
