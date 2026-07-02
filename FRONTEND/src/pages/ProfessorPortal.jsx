import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getProfessorPortal, updateProfessorCpt } from "../api/portals";

function ProfessorPortal() {
  const token = localStorage.getItem("professorToken");
  const professorName = localStorage.getItem("professorName") || "Professeur";
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ start_date: "", end_date: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedBranches, setExpandedBranches] = useState({});
  const [expandedStudents, setExpandedStudents] = useState({});
  const [cptForms, setCptForms] = useState({});
  const [cptFeedback, setCptFeedback] = useState({});

  const reloadReports = useCallback(async () => {
    if (!token) return;
    const res = await getProfessorPortal(token, {
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
    });
    setData(res.data);
    setError("");
    if (res.data?.branches?.length === 1) {
      setExpandedBranches({ [res.data.branches[0].promotion.id]: true });
    }
  }, [token, filters.start_date, filters.end_date]);

  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  }, []);

  useEffect(() => {
    if (!token) return;
    let ignore = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await getProfessorPortal(token, {
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        });
        if (ignore) return;
        setData(res.data);
        setError("");
        if (res.data?.branches?.length === 1) {
          setExpandedBranches({ [res.data.branches[0].promotion.id]: true });
        }
      } catch (err) {
        if (!ignore) {
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem("professorToken");
            localStorage.removeItem("professorName");
            navigate("/professor/login");
            return;
          }
          setError("Impossible de charger vos promotions.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [token, filters.start_date, filters.end_date, navigate]);

  if (!token) return <Navigate to="/professor/login" />;

  const logout = () => {
    localStorage.removeItem("professorToken");
    localStorage.removeItem("professorName");
    navigate("/professor/login");
  };

  const branches = data?.branches || [];

  const toggleBranch = (promotionId) => {
    setExpandedBranches((current) => ({
      ...current,
      [promotionId]: !current[promotionId],
    }));
  };

  const toggleStudent = (enrollmentId) => {
    setExpandedStudents((current) => ({
      ...current,
      [enrollmentId]: !current[enrollmentId],
    }));
  };

  const getCptForm = (enrollmentId) =>
    cptForms[enrollmentId] || { delta: "", note: "" };

  const setCptForm = (enrollmentId, changes) => {
    setCptForms((current) => ({
      ...current,
      [enrollmentId]: { ...getCptForm(enrollmentId), ...changes },
    }));
  };

  const submitCpt = async (enrollmentId, signedDelta) => {
    const form = getCptForm(enrollmentId);
    const delta = signedDelta ?? Number(form.delta);
    if (!delta || Number.isNaN(delta)) {
      setCptFeedback({ [enrollmentId]: "Indiquez un nombre de points valide." });
      return;
    }

    try {
      const res = await updateProfessorCpt(token, {
        enrollment_id: enrollmentId,
        delta,
        note: form.note,
      });
      setCptFeedback({ [enrollmentId]: res.data.message });
      setCptForm(enrollmentId, { delta: "", note: "" });
      await reloadReports();
    } catch {
      setCptFeedback({ [enrollmentId]: "Mise a jour CPT impossible." });
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Espace professeur</h1>
          <p style={subtitleStyle}>Bonjour {professorName}</p>
        </div>
        <button type="button" onClick={logout} style={logoutBtn}>
          Deconnexion
        </button>
      </header>

      <main style={mainStyle}>
        <section style={introCard}>
          <h2 style={sectionTitle}>Mes promotions</h2>
          <p style={introText}>
            Consultez l&apos;assiduite de vos etudiants par promotion et gerez
            leurs points de comportement (CPT).
          </p>
          <div style={periodRow}>
            <label style={fieldLabel}>
              Periode du
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) =>
                  setFilters({ ...filters, start_date: e.target.value })
                }
                style={inputStyle}
              />
            </label>
            <label style={fieldLabel}>
              au
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) =>
                  setFilters({ ...filters, end_date: e.target.value })
                }
                style={inputStyle}
              />
            </label>
          </div>
        </section>

        {loading && <p style={mutedText}>Chargement de vos promotions...</p>}

        {error && <p style={errorText}>{error}</p>}

        <div style={treeStyle}>
          {branches.map((branch) => {
            const isOpen = expandedBranches[branch.promotion.id];
            return (
              <section key={branch.promotion.id} style={branchCard}>
                <button
                  type="button"
                  onClick={() => toggleBranch(branch.promotion.id)}
                  style={branchHeader}
                >
                  <span style={branchToggle}>{isOpen ? "▼" : "▶"}</span>
                  <div>
                    <strong>{branch.promotion.name}</strong>
                    <div style={branchSub}>
                      {branch.promotion.faculty} · {branch.students.length}{" "}
                      etudiant(s)
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div style={branchBody}>
                    {branch.students.length === 0 ? (
                      <p style={mutedText}>Aucun etudiant inscrit.</p>
                    ) : (
                      branch.students.map((studentNode) => {
                        const enrollmentId = studentNode.enrollment_id;
                        const isStudentOpen = expandedStudents[enrollmentId];
                        const form = getCptForm(enrollmentId);
                        const summary = studentNode.attendance.summary;

                        return (
                          <article key={enrollmentId} style={studentCard}>
                            <button
                              type="button"
                              onClick={() => toggleStudent(enrollmentId)}
                              style={studentHeader}
                            >
                              <span style={branchToggle}>
                                {isStudentOpen ? "▾" : "▸"}
                              </span>
                              <div style={studentTitleBlock}>
                                <strong>{studentNode.student.name}</strong>
                                <span style={studentMatricule}>
                                  {studentNode.student.matricule}
                                </span>
                              </div>
                              <div style={studentBadges}>
                                <Badge label="Presences" value={summary.present_days} />
                                <Badge label="Retards" value={summary.late_count} />
                                <Badge label="Absences" value={summary.absence_count} />
                                <Badge label="CPT" value={studentNode.cpt.balance} />
                              </div>
                            </button>

                            {isStudentOpen && (
                              <div style={studentBody}>
                                <div style={attendanceBlock}>
                                  <h3 style={blockTitle}>Assiduite</h3>
                                  <div style={statsGrid}>
                                    <Stat label="Jours attendus" value={summary.expected_days} />
                                    <Stat label="Presences" value={summary.present_days} />
                                    <Stat label="Retards" value={summary.late_count} />
                                    <Stat label="Absences" value={summary.absence_count} />
                                  </div>
                                  <p style={mutedText}>
                                    Periode : {studentNode.attendance.period.start} →{" "}
                                    {studentNode.attendance.period.end}
                                  </p>
                                  <p style={mutedText}>
                                    Jours absents :{" "}
                                    {studentNode.attendance.absent_dates.length
                                      ? studentNode.attendance.absent_dates.join(", ")
                                      : "Aucun"}
                                  </p>
                                </div>

                                <div style={cptBlock}>
                                  <h3 style={blockTitle}>
                                    Points de comportement (CPT)
                                  </h3>
                                  <p style={cptBalance}>
                                    Solde actuel :{" "}
                                    <strong>{studentNode.cpt.balance}</strong>
                                  </p>
                                  <div style={cptFormRow}>
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="Points"
                                      value={form.delta}
                                      onChange={(e) =>
                                        setCptForm(enrollmentId, {
                                          delta: e.target.value,
                                        })
                                      }
                                      style={inputStyle}
                                    />
                                    <input
                                      placeholder="Motif"
                                      value={form.note}
                                      onChange={(e) =>
                                        setCptForm(enrollmentId, {
                                          note: e.target.value,
                                        })
                                      }
                                      style={inputStyle}
                                    />
                                    <button
                                      type="button"
                                      style={addBtn}
                                      onClick={() =>
                                        submitCpt(
                                          enrollmentId,
                                          Math.abs(Number(form.delta) || 0),
                                        )
                                      }
                                    >
                                      Ajouter
                                    </button>
                                    <button
                                      type="button"
                                      style={removeBtn}
                                      onClick={() =>
                                        submitCpt(
                                          enrollmentId,
                                          -Math.abs(Number(form.delta) || 0),
                                        )
                                      }
                                    >
                                      Retirer
                                    </button>
                                  </div>
                                  {cptFeedback[enrollmentId] && (
                                    <p style={feedbackText}>
                                      {cptFeedback[enrollmentId]}
                                    </p>
                                  )}
                                  {studentNode.cpt.entries.length > 0 ? (
                                    <ul style={historyList}>
                                      {studentNode.cpt.entries.map((entry) => (
                                        <li key={entry.id} style={historyItem}>
                                          <span>
                                            {entry.points_delta > 0 ? "+" : ""}
                                            {entry.points_delta} pts
                                          </span>
                                          <span>{entry.note || "Sans motif"}</span>
                                          <span style={historyMeta}>
                                            {new Date(entry.created_at).toLocaleDateString()}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p style={mutedText}>Aucun mouvement CPT.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {!loading && !error && branches.length === 0 && (
          <p style={mutedText}>Aucune promotion ne vous est affectee.</p>
        )}
      </main>
    </div>
  );
}

function Badge({ label, value }) {
  return (
    <span style={badgeStyle}>
      {label}: {value}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div style={statCard}>
      <span style={statLabel}>{label}</span>
      <strong style={statValue}>{value}</strong>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#f3f6fb",
};
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "24px 28px",
  backgroundColor: "#1a237e",
  color: "white",
};
const subtitleStyle = { margin: "6px 0 0", opacity: 0.85 };
const logoutBtn = {
  padding: "10px 16px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#c62828",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};
const mainStyle = { padding: "24px 28px", maxWidth: "1100px", margin: "0 auto" };
const introCard = {
  backgroundColor: "white",
  borderRadius: "14px",
  padding: "20px 22px",
  marginBottom: "20px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};
const sectionTitle = { margin: "0 0 8px", color: "#1a237e" };
const introText = { margin: "0 0 16px", color: "#555", lineHeight: 1.5 };
const periodRow = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};
const fieldLabel = { display: "grid", gap: "6px", fontSize: "14px", color: "#444" };
const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
};
const treeStyle = { display: "grid", gap: "16px" };
const branchCard = {
  backgroundColor: "white",
  borderRadius: "14px",
  overflow: "hidden",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};
const branchHeader = {
  width: "100%",
  display: "flex",
  gap: "12px",
  alignItems: "center",
  padding: "18px 20px",
  border: "none",
  backgroundColor: "#eef3fb",
  cursor: "pointer",
  textAlign: "left",
};
const branchToggle = { color: "#1565c0", fontWeight: 700, width: "18px" };
const branchSub = { color: "#607d8b", fontSize: "13px", marginTop: "4px" };
const branchBody = { padding: "12px 16px 18px" };
const studentCard = {
  border: "1px solid #e0e6ef",
  borderRadius: "12px",
  overflow: "hidden",
  marginBottom: "10px",
};
const studentHeader = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "18px 1fr auto",
  gap: "12px",
  alignItems: "center",
  padding: "14px 16px",
  border: "none",
  backgroundColor: "#fafbfd",
  cursor: "pointer",
  textAlign: "left",
};
const studentTitleBlock = { display: "grid", gap: "2px" };
const studentMatricule = { color: "#666", fontSize: "13px" };
const studentBadges = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  justifyContent: "flex-end",
};
const badgeStyle = {
  backgroundColor: "#e8eef8",
  color: "#1a237e",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "12px",
};
const studentBody = { padding: "16px", borderTop: "1px solid #e0e6ef" };
const attendanceBlock = { marginBottom: "18px" };
const blockTitle = { margin: "0 0 12px", color: "#333", fontSize: "16px" };
const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "10px",
  marginBottom: "12px",
};
const statCard = {
  backgroundColor: "#f5f9ff",
  borderRadius: "10px",
  padding: "12px",
  display: "grid",
  gap: "6px",
};
const statLabel = { color: "#666", fontSize: "13px" };
const statValue = { color: "#1565c0", fontSize: "22px" };
const cptBlock = {
  backgroundColor: "#fffbea",
  border: "1px solid #ffe082",
  borderRadius: "12px",
  padding: "14px",
};
const cptBalance = { margin: "0 0 12px", color: "#444" };
const cptFormRow = {
  display: "grid",
  gridTemplateColumns: "100px 1fr auto auto",
  gap: "8px",
  marginBottom: "10px",
};
const addBtn = {
  padding: "10px 12px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#2e7d32",
  color: "white",
  cursor: "pointer",
};
const removeBtn = {
  padding: "10px 12px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#c62828",
  color: "white",
  cursor: "pointer",
};
const feedbackText = { color: "#1565c0", margin: "0 0 8px" };
const historyList = { listStyle: "none", margin: 0, padding: 0 };
const historyItem = {
  display: "grid",
  gridTemplateColumns: "80px 1fr auto",
  gap: "10px",
  padding: "8px 0",
  borderBottom: "1px solid #f0e6c8",
  fontSize: "14px",
};
const historyMeta = { color: "#777", fontSize: "12px" };
const mutedText = { color: "#666" };
const errorText = { color: "#c62828" };

export default ProfessorPortal;
