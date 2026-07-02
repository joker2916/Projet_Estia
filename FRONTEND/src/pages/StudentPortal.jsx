import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getStudentPortal } from "../api/portals";
import BadgeSimulator from "../components/BadgeSimulator";
import { StudentEvolutionCharts } from "../components/EvolutionCharts";
import { AuthShell, PeriodFilter, Metric } from "./StudentLogin";

function StudentPortal() {
  const token = localStorage.getItem("studentToken");
  const studentName = localStorage.getItem("studentName") || "Etudiant";
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ start_date: "", end_date: "" });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getStudentPortal(token, {
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      });
      setReport(res.data);
      setError("");
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("studentToken");
        localStorage.removeItem("studentName");
        navigate("/student/login");
        return;
      }
      setError("Impossible de charger votre espace etudiant.");
    } finally {
      setLoading(false);
    }
  }, [token, filters.start_date, filters.end_date, navigate]);

  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("professorToken");
    localStorage.removeItem("professorName");
  }, []);

  useEffect(() => {
    if (!token) return;
    loadReport();
  }, [token, loadReport]);

  if (!token) return <Navigate to="/student/login" />;

  const logout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("studentName");
    navigate("/student/login");
  };

  const studentNode = report
    ? {
        enrollment_id: report.enrollment?.id,
        student: report.student,
        attendance: report.attendance,
        cpt: report.cpt,
      }
    : null;

  const financial = report?.financial;
  const installments = financial?.installments || [];

  return (
    <AuthShell title="Espace Etudiant" subtitle={`Bonjour ${studentName}`} onLogout={logout}>
      <PeriodFilter filters={filters} setFilters={setFilters} />

      {loading && <p style={mutedText}>Chargement...</p>}
      {error && <p style={errorText}>{error}</p>}

      {report && (
        <>
          <section style={headerBlock}>
            <h2 style={{ margin: "0 0 6px" }}>{report.student.name}</h2>
            <p style={mutedText}>
              {report.enrollment.faculty} / {report.enrollment.promotion} /{" "}
              {report.enrollment.academic_year}
            </p>
            <p style={mutedText}>
              Validite : {report.enrollment.valid_from} → {report.enrollment.valid_to}
            </p>
          </section>

          <section style={financeSection}>
            <div style={financeHeader}>
              <h3 style={sectionTitle}>Scolarite</h3>
              <span
                style={{
                  ...standingBadge,
                  backgroundColor: financial?.is_in_good_standing ? "#e8f5e9" : "#ffebee",
                  color: financial?.is_in_good_standing ? "#1b5e20" : "#b71c1c",
                }}
              >
                {financial?.is_in_good_standing ? "En regle" : "Impaye / en retard"}
              </span>
            </div>
            <div style={gridStyle}>
              <Metric label="Solde restant" value={`${financial?.balance_due || 0} USD`} />
              <Metric label="Total paye" value={`${financial?.total_paid || 0} USD`} />
              <Metric label="Total du" value={`${financial?.total_due || 0} USD`} />
            </div>
            {installments.length > 0 ? (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Tranche</th>
                    <th style={thStyle}>Montant</th>
                    <th style={thStyle}>Echeance</th>
                    <th style={thStyle}>Statut</th>
                    <th style={thStyle}>Paye le</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((item) => (
                    <tr key={item.installment_number}>
                      <td style={tdStyle}>{item.label}</td>
                      <td style={tdStyle}>{item.amount} USD</td>
                      <td style={tdStyle}>{item.due_date}</td>
                      <td style={tdStyle}>{formatInstallmentStatus(item.status)}</td>
                      <td style={tdStyle}>
                        {item.paid_at
                          ? new Date(item.paid_at).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={mutedText}>Barème de scolarité non défini pour votre promotion.</p>
            )}
          </section>

          {studentNode && <StudentEvolutionCharts studentNode={studentNode} />}

          <section style={attendanceSection}>
            <h3 style={sectionTitle}>Assiduite</h3>
            <div style={gridStyle}>
              <Metric label="Jours attendus" value={report.attendance.summary.expected_days} />
              <Metric label="Presences" value={report.attendance.summary.present_days} />
              <Metric label="Retards" value={report.attendance.summary.late_count} />
              <Metric label="Absences" value={report.attendance.summary.absence_count} />
              <Metric label="CPT" value={report.cpt.balance} />
            </div>
            <p style={mutedText}>
              Periode : {report.attendance.period.start} → {report.attendance.period.end}
            </p>
            <p style={mutedText}>
              Jours absents :{" "}
              {report.attendance.absent_dates.length
                ? report.attendance.absent_dates.join(", ")
                : "Aucun"}
            </p>
          </section>

          <BadgeSimulator
            token={token}
            cardUid={report.card?.uid}
            studentName={report.student.name}
            onScanComplete={loadReport}
          />
        </>
      )}
    </AuthShell>
  );
}

function formatInstallmentStatus(status) {
  if (status === "paid") return "Payee";
  if (status === "overdue") return "En retard";
  return "En attente";
}

const headerBlock = { marginBottom: "20px" };
const financeSection = {
  marginBottom: "20px",
  padding: "16px",
  borderRadius: "12px",
  backgroundColor: "#fffbea",
  border: "1px solid #ffe082",
};
const financeHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "12px",
};
const sectionTitle = { margin: 0, color: "#1a237e" };
const standingBadge = {
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 600,
};
const attendanceSection = { marginBottom: "8px" };
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "12px",
  margin: "12px 0",
};
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: "8px" };
const thStyle = { textAlign: "left", padding: "10px", backgroundColor: "#fff8e1" };
const tdStyle = { padding: "10px", borderBottom: "1px solid #f0e6c8" };
const mutedText = { color: "#666" };
const errorText = { color: "#c62828" };

export default StudentPortal;
