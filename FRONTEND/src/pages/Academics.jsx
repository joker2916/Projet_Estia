import { useEffect, useState } from "react";
import api from "../api/axios";
import Students from "./Students";
import PageHeader from "../components/PageHeader";
import ContentCard from "../components/ContentCard";

function Academics() {
  const [tab, setTab] = useState("faculties");

  const [faculties, setFaculties] = useState([]);
  const [years, setYears] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const [facultyForm, setFacultyForm] = useState({ name: "", code: "" });
  const [yearForm, setYearForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_current: false,
  });
  const [promotionForm, setPromotionForm] = useState({
    faculty: "",
    department: "",
    name: "",
    code: "",
    level: "",
  });
  const [enrollmentForm, setEnrollmentForm] = useState({
    student: "",
    faculty: "",
    department: "",
    promotion: "",
    academic_year: "",
    is_active: true,
  });

  const fetchFaculties = async () => {
    const res = await api.get("faculties/", { params: { status: "all" } });
    setFaculties(res.data);
  };

  const fetchYears = async () => {
    const res = await api.get("academic-years/");
    setYears(res.data);
  };

  const fetchPromotions = async () => {
    const res = await api.get("promotions/", { params: { status: "all" } });
    setPromotions(res.data);
  };

  const fetchStudents = async () => {
    const res = await api.get("students/");
    setStudents(res.data);
  };

  const fetchEnrollments = async () => {
    const res = await api.get("enrollments/", { params: { status: "all" } });
    setEnrollments(res.data);
  };

  useEffect(() => {
    fetchFaculties();
    fetchYears();
    fetchPromotions();
    fetchStudents();
    fetchEnrollments();
  }, []);

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    await api.post("faculties/", facultyForm);
    setFacultyForm({ name: "", code: "" });
    fetchFaculties();
  };

  const handleFacultyStatus = async (faculty) => {
    if (faculty.is_active) {
      await api.post(`faculties/${faculty.id}/deactivate/`);
    } else {
      await api.post(`faculties/${faculty.id}/reactivate/`);
    }
    fetchFaculties();
  };

  const handleCreateYear = async (e) => {
    e.preventDefault();
    await api.post("academic-years/", yearForm);
    setYearForm({ name: "", start_date: "", end_date: "", is_current: false });
    fetchYears();
  };

  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    await api.post("promotions/", {
      ...promotionForm,
      department: promotionForm.department || null,
    });
    setPromotionForm({ faculty: "", department: "", name: "", code: "", level: "" });
    fetchPromotions();
  };

  const handlePromotionStatus = async (promotion) => {
    if (promotion.is_active) {
      await api.post(`promotions/${promotion.id}/deactivate/`);
    } else {
      await api.post(`promotions/${promotion.id}/reactivate/`);
    }
    fetchPromotions();
  };

  const handleCreateEnrollment = async (e) => {
    e.preventDefault();
    await api.post("enrollments/", {
      ...enrollmentForm,
      department: enrollmentForm.department || null,
    });
    setEnrollmentForm({
      student: "",
      faculty: "",
      department: "",
      promotion: "",
      academic_year: "",
      is_active: true,
    });
    fetchEnrollments();
    fetchStudents();
  };

  return (
    <div>
      <PageHeader
        title="Gestion Academique"
        subtitle="Gestion centralisée de la structure académique, des étudiants et des inscriptions."
      />

      <div style={overviewGrid}>
        <OverviewCard label="Facultes" value={faculties.length} color="#1565c0" />
        <OverviewCard label="Promotions" value={promotions.length} color="#2e7d32" />
        <OverviewCard label="Etudiants" value={students.length} color="#ef6c00" />
        <OverviewCard label="Inscriptions" value={enrollments.length} color="#6a1b9a" />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <TabButton label="Facultes" active={tab === "faculties"} onClick={() => setTab("faculties")} />
        <TabButton label="Annees" active={tab === "years"} onClick={() => setTab("years")} />
        <TabButton label="Promotions" active={tab === "promotions"} onClick={() => setTab("promotions")} />
        <TabButton label="Etudiants" active={tab === "students"} onClick={() => setTab("students")} />
        <TabButton label="Inscriptions" active={tab === "enrollments"} onClick={() => setTab("enrollments")} />
      </div>

      {tab === "faculties" && (
        <Section title="Facultes">
          <form onSubmit={handleCreateFaculty} style={formGrid}>
            <input
              placeholder="Nom de la faculte"
              value={facultyForm.name}
              onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              placeholder="Code"
              value={facultyForm.code}
              onChange={(e) => setFacultyForm({ ...facultyForm, code: e.target.value })}
              required
              style={inputStyle}
            />
            <button type="submit" style={primaryBtn}>Ajouter</button>
          </form>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Nom</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {faculties.map((f) => (
                <tr key={f.id}>
                  <td style={tdStyle}>{f.name}</td>
                  <td style={tdStyle}>{f.code}</td>
                  <td style={tdStyle}>{f.is_active ? "Active" : "Desactivee"}</td>
                  <td style={tdStyle}>
                    <button style={f.is_active ? dangerBtn : successBtn} onClick={() => handleFacultyStatus(f)}>
                      {f.is_active ? "Desactiver" : "Reactiver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === "years" && (
        <Section title="Annees academiques">
          <form onSubmit={handleCreateYear} style={formGrid3}>
            <input
              placeholder="Ex: 2026-2027"
              value={yearForm.name}
              onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={yearForm.start_date}
              onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={yearForm.end_date}
              onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
              required
              style={inputStyle}
            />
            <label style={checkboxLabel}>
              <input
                type="checkbox"
                checked={yearForm.is_current}
                onChange={(e) => setYearForm({ ...yearForm, is_current: e.target.checked })}
              />
              Annee courante
            </label>
            <button type="submit" style={primaryBtn}>Ajouter</button>
          </form>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Annee</th>
                <th style={thStyle}>Debut</th>
                <th style={thStyle}>Fin</th>
                <th style={thStyle}>Courante</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.id}>
                  <td style={tdStyle}>{y.name}</td>
                  <td style={tdStyle}>{y.start_date}</td>
                  <td style={tdStyle}>{y.end_date}</td>
                  <td style={tdStyle}>{y.is_current ? "Oui" : "Non"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === "promotions" && (
        <Section title="Promotions">
          <form onSubmit={handleCreatePromotion} style={formGrid3}>
            <select
              value={promotionForm.faculty}
              onChange={(e) => setPromotionForm({ ...promotionForm, faculty: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">-- Faculte --</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <input
              placeholder="Nom (ex: L3 Informatique)"
              value={promotionForm.name}
              onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              placeholder="Code (ex: L3-INFO)"
              value={promotionForm.code}
              onChange={(e) => setPromotionForm({ ...promotionForm, code: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              placeholder="Niveau (ex: L3)"
              value={promotionForm.level}
              onChange={(e) => setPromotionForm({ ...promotionForm, level: e.target.value })}
              style={inputStyle}
            />
            <button type="submit" style={primaryBtn}>Ajouter</button>
          </form>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Nom</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Faculte</th>
                <th style={thStyle}>Niveau</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.code}</td>
                  <td style={tdStyle}>{p.faculty_name}</td>
                  <td style={tdStyle}>{p.level || "-"}</td>
                  <td style={tdStyle}>{p.is_active ? "Active" : "Desactivee"}</td>
                  <td style={tdStyle}>
                    <button style={p.is_active ? dangerBtn : successBtn} onClick={() => handlePromotionStatus(p)}>
                      {p.is_active ? "Desactiver" : "Reactiver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {tab === "students" && <Students embedded />}

      {tab === "enrollments" && (
        <Section title="Inscriptions">
          <form onSubmit={handleCreateEnrollment} style={formGrid3}>
            <select
              value={enrollmentForm.student}
              onChange={(e) => setEnrollmentForm({ ...enrollmentForm, student: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">-- Etudiant --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.matricule})</option>
              ))}
            </select>
            <select
              value={enrollmentForm.faculty}
              onChange={(e) => setEnrollmentForm({ ...enrollmentForm, faculty: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">-- Faculte --</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select
              value={enrollmentForm.promotion}
              onChange={(e) => setEnrollmentForm({ ...enrollmentForm, promotion: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">-- Promotion --</option>
              {promotions
                .filter((p) => !enrollmentForm.faculty || String(p.faculty) === String(enrollmentForm.faculty))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
            <select
              value={enrollmentForm.academic_year}
              onChange={(e) => setEnrollmentForm({ ...enrollmentForm, academic_year: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">-- Annee academique --</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
            <button type="submit" style={primaryBtn}>Inscrire</button>
          </form>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Etudiant</th>
                <th style={thStyle}>Faculte</th>
                <th style={thStyle}>Promotion</th>
                <th style={thStyle}>Annee</th>
                <th style={thStyle}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id}>
                  <td style={tdStyle}>{e.student_name}</td>
                  <td style={tdStyle}>{e.faculty_name}</td>
                  <td style={tdStyle}>{e.promotion_name}</td>
                  <td style={tdStyle}>{e.academic_year_name}</td>
                  <td style={tdStyle}>{e.is_active ? "Active" : "Terminee"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        border: active ? "1px solid #1976d2" : "1px solid #bbdefb",
        borderRadius: "8px",
        backgroundColor: active ? "#1976d2" : "white",
        color: active ? "white" : "#1565c0",
        fontWeight: "bold",
        cursor: "pointer",
        boxShadow: active ? "0 4px 12px rgba(25, 118, 210, 0.25)" : "none",
      }}
    >
      {label}
    </button>
  );
}

function OverviewCard({ label, value, color }) {
  return (
    <div style={{ ...overviewCard, borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <ContentCard style={sectionStyle}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </ContentCard>
  );
}

const sectionStyle = {
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const overviewGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const overviewCard = {
  backgroundColor: "white",
  borderRadius: "10px",
  padding: "14px 16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr auto",
  gap: "10px",
  marginBottom: "20px",
};

const formGrid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  marginBottom: "20px",
};

const inputStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "14px",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
  padding: "10px",
  backgroundColor: "#f5f5f5",
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};

const primaryBtn = {
  padding: "10px 14px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#1976d2",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
};

const dangerBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#d32f2f",
  color: "white",
  cursor: "pointer",
};

const successBtn = {
  padding: "6px 10px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: "#2e7d32",
  color: "white",
  cursor: "pointer",
};

const checkboxLabel = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  fontSize: "14px",
  color: "#333",
};

export default Academics;
