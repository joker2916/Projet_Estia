import { Fragment, useEffect, useState } from "react";
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
    course_start_date: "",
    course_end_date: "",
  });
  const [enrollmentForm, setEnrollmentForm] = useState({
    student: "",
    faculty: "",
    department: "",
    promotion: "",
    academic_year: "",
    is_active: true,
  });
  const [tuitionPromotionId, setTuitionPromotionId] = useState("");
  const [tuitionYearId, setTuitionYearId] = useState("");
  const [tuitionInstallments, setTuitionInstallments] = useState(defaultInstallments());
  const [tuitionMessage, setTuitionMessage] = useState("");
  const [expandedEnrollmentId, setExpandedEnrollmentId] = useState(null);
  const [enrollmentFinance, setEnrollmentFinance] = useState(null);

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
    let ignore = false;

    const loadInitialData = async () => {
      const [facultiesRes, yearsRes, promotionsRes, studentsRes, enrollmentsRes] =
        await Promise.all([
          api.get("faculties/", { params: { status: "all" } }),
          api.get("academic-years/"),
          api.get("promotions/", { params: { status: "all" } }),
          api.get("students/"),
          api.get("enrollments/", { params: { status: "all" } }),
        ]);

      if (ignore) return;
      setFaculties(facultiesRes.data);
      setYears(yearsRes.data);
      setPromotions(promotionsRes.data);
      setStudents(studentsRes.data);
      setEnrollments(enrollmentsRes.data);
    };

    loadInitialData();

    return () => {
      ignore = true;
    };
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
    fetchPromotions();
    fetchEnrollments();
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
    setPromotionForm({
      faculty: "",
      department: "",
      name: "",
      code: "",
      level: "",
      course_start_date: "",
      course_end_date: "",
    });
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

  const loadTuitionPlan = async (promotionId, yearId) => {
    if (!promotionId || !yearId) return;
    const res = await api.get(`promotions/${promotionId}/tuition-plan/`, {
      params: { academic_year_id: yearId },
    });
    const rows = res.data.installments?.length
      ? res.data.installments
      : defaultInstallments();
    setTuitionInstallments(
      rows.map((item) => ({
        installment_number: item.installment_number,
        label: item.label || `Tranche ${item.installment_number}`,
        amount: item.amount || "",
        due_date: item.due_date || "",
      })),
    );
  };

  const handleSaveTuitionPlan = async (e) => {
    e.preventDefault();
    if (!tuitionPromotionId || !tuitionYearId) return;
    await api.put(`promotions/${tuitionPromotionId}/tuition-plan/`, {
      academic_year_id: Number(tuitionYearId),
      installments: tuitionInstallments,
    });
    setTuitionMessage("Barème enregistré.");
  };

  const handleShowEnrollmentFinance = async (enrollmentId) => {
    if (expandedEnrollmentId === enrollmentId) {
      setExpandedEnrollmentId(null);
      setEnrollmentFinance(null);
      return;
    }
    const res = await api.get(`enrollments/${enrollmentId}/installments/`);
    setExpandedEnrollmentId(enrollmentId);
    setEnrollmentFinance(res.data.financial);
  };

  const handleMarkInstallmentPaid = async (enrollmentId, installmentNumber) => {
    await api.put(
      `enrollments/${enrollmentId}/installments/${installmentNumber}/`,
      {},
    );
    const res = await api.get(`enrollments/${enrollmentId}/installments/`);
    setEnrollmentFinance(res.data.financial);
  };

  return (
    <div>
      <PageHeader
        title="Gestion Academique"
        subtitle="Gestion centralisée de la structure académique, des étudiants et des inscriptions."
      />

      <div style={overviewGrid}>
        <OverviewCard
          label="Facultes"
          value={faculties.filter((faculty) => faculty.is_active).length}
          color="#1565c0"
        />
        <OverviewCard
          label="Promotions"
          value={promotions.filter((promotion) => promotion.is_active).length}
          color="#2e7d32"
        />
        <OverviewCard
          label="Etudiants"
          value={students.length}
          color="#ef6c00"
        />
        <OverviewCard
          label="Inscriptions"
          value={enrollments.length}
          color="#6a1b9a"
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <TabButton
          label="Facultes"
          active={tab === "faculties"}
          onClick={() => setTab("faculties")}
        />
        <TabButton
          label="Annees"
          active={tab === "years"}
          onClick={() => setTab("years")}
        />
        <TabButton
          label="Promotions"
          active={tab === "promotions"}
          onClick={() => setTab("promotions")}
        />
        <TabButton
          label="Etudiants"
          active={tab === "students"}
          onClick={() => setTab("students")}
        />
        <TabButton
          label="Inscriptions"
          active={tab === "enrollments"}
          onClick={() => setTab("enrollments")}
        />
      </div>

      {tab === "faculties" && (
        <Section title="Facultes">
          <form onSubmit={handleCreateFaculty} style={formGrid}>
            <input
              placeholder="Nom de la faculte"
              value={facultyForm.name}
              onChange={(e) =>
                setFacultyForm({ ...facultyForm, name: e.target.value })
              }
              required
              style={inputStyle}
            />
            <input
              placeholder="Code"
              value={facultyForm.code}
              onChange={(e) =>
                setFacultyForm({ ...facultyForm, code: e.target.value })
              }
              required
              style={inputStyle}
            />
            <button type="submit" style={primaryBtn}>
              Ajouter
            </button>
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
                  <td style={tdStyle}>
                    {f.is_active ? "Active" : "Desactivee"}
                  </td>
                  <td style={tdStyle}>
                    <button
                      style={f.is_active ? dangerBtn : successBtn}
                      onClick={() => handleFacultyStatus(f)}
                    >
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
              onChange={(e) =>
                setYearForm({ ...yearForm, name: e.target.value })
              }
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={yearForm.start_date}
              onChange={(e) =>
                setYearForm({ ...yearForm, start_date: e.target.value })
              }
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={yearForm.end_date}
              onChange={(e) =>
                setYearForm({ ...yearForm, end_date: e.target.value })
              }
              required
              style={inputStyle}
            />
            <label style={checkboxLabel}>
              <input
                type="checkbox"
                checked={yearForm.is_current}
                onChange={(e) =>
                  setYearForm({ ...yearForm, is_current: e.target.checked })
                }
              />
              Annee courante
            </label>
            <button type="submit" style={primaryBtn}>
              Ajouter
            </button>
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
          <p style={hintStyle}>
            Definissez la periode de cours de la promotion. Les inscriptions
            des etudiants restent valides uniquement pendant cette periode
            pour le pointage RFID et les rapports d&apos;assiduite.
          </p>
          <form onSubmit={handleCreatePromotion} style={formGrid3}>
            <select
              value={promotionForm.faculty}
              onChange={(e) =>
                setPromotionForm({ ...promotionForm, faculty: e.target.value })
              }
              required
              style={inputStyle}
            >
              <option value="">-- Faculte --</option>
              {faculties
                .filter((f) => f.is_active)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
            <input
              placeholder="Nom (ex: L3 Informatique)"
              value={promotionForm.name}
              onChange={(e) =>
                setPromotionForm({ ...promotionForm, name: e.target.value })
              }
              required
              style={inputStyle}
            />
            <input
              placeholder="Code (ex: L3-INFO)"
              value={promotionForm.code}
              onChange={(e) =>
                setPromotionForm({ ...promotionForm, code: e.target.value })
              }
              required
              style={inputStyle}
            />
            <input
              placeholder="Niveau (ex: L3)"
              value={promotionForm.level}
              onChange={(e) =>
                setPromotionForm({ ...promotionForm, level: e.target.value })
              }
              style={inputStyle}
            />
            <input
              type="date"
              value={promotionForm.course_start_date}
              onChange={(e) =>
                setPromotionForm({
                  ...promotionForm,
                  course_start_date: e.target.value,
                })
              }
              required
              style={inputStyle}
              title="Debut des cours"
            />
            <input
              type="date"
              value={promotionForm.course_end_date}
              onChange={(e) =>
                setPromotionForm({
                  ...promotionForm,
                  course_end_date: e.target.value,
                })
              }
              required
              style={inputStyle}
              title="Fin des cours"
            />
            <button type="submit" style={primaryBtn}>
              Ajouter
            </button>
          </form>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Nom</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Faculte</th>
                <th style={thStyle}>Niveau</th>
                <th style={thStyle}>Debut cours</th>
                <th style={thStyle}>Fin cours</th>
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
                  <td style={tdStyle}>{p.course_start_date || "-"}</td>
                  <td style={tdStyle}>{p.course_end_date || "-"}</td>
                  <td style={tdStyle}>
                    {p.is_active ? "Active" : "Desactivee"}
                  </td>
                  <td style={tdStyle}>
                    <button
                      style={p.is_active ? dangerBtn : successBtn}
                      onClick={() => handlePromotionStatus(p)}
                    >
                      {p.is_active ? "Desactiver" : "Reactiver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={tuitionPanel}>
            <h3 style={{ marginTop: 0 }}>Frais de scolarite (4 tranches)</h3>
            <div style={formGrid3}>
              <select
                value={tuitionPromotionId}
                onChange={(e) => {
                  setTuitionPromotionId(e.target.value);
                  loadTuitionPlan(e.target.value, tuitionYearId);
                }}
                style={inputStyle}
              >
                <option value="">-- Promotion --</option>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={tuitionYearId}
                onChange={(e) => {
                  setTuitionYearId(e.target.value);
                  loadTuitionPlan(tuitionPromotionId, e.target.value);
                }}
                style={inputStyle}
              >
                <option value="">-- Annee academique --</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
            {tuitionInstallments.map((item, index) => (
              <div key={item.installment_number} style={installmentRow}>
                <strong>Tranche {item.installment_number}</strong>
                <input
                  placeholder="Libelle"
                  value={item.label}
                  onChange={(e) => {
                    const next = [...tuitionInstallments];
                    next[index] = { ...next[index], label: e.target.value };
                    setTuitionInstallments(next);
                  }}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Montant"
                  value={item.amount}
                  onChange={(e) => {
                    const next = [...tuitionInstallments];
                    next[index] = { ...next[index], amount: e.target.value };
                    setTuitionInstallments(next);
                  }}
                  style={inputStyle}
                />
                <input
                  type="date"
                  value={item.due_date}
                  onChange={(e) => {
                    const next = [...tuitionInstallments];
                    next[index] = { ...next[index], due_date: e.target.value };
                    setTuitionInstallments(next);
                  }}
                  style={inputStyle}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleSaveTuitionPlan}
              style={{ ...primaryBtn, marginTop: "12px" }}
              disabled={!tuitionPromotionId || !tuitionYearId}
            >
              Enregistrer le barème
            </button>
            {tuitionMessage && <p style={hintStyle}>{tuitionMessage}</p>}
          </div>
        </Section>
      )}

      {tab === "students" && <Students embedded />}

      {tab === "enrollments" && (
        <Section title="Inscriptions">
          <p style={hintStyle}>
            Inscrivez ici un étudiant dans une faculté, une promotion et une année
            académique. C&apos;est cette inscription qui sert au pointage RFID et
            aux rapports d&apos;assiduité.
          </p>
          <form onSubmit={handleCreateEnrollment} style={formGrid3}>
            <select
              value={enrollmentForm.student}
              onChange={(e) =>
                setEnrollmentForm({
                  ...enrollmentForm,
                  student: e.target.value,
                })
              }
              required
              style={inputStyle}
            >
              <option value="">-- Etudiant --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.matricule})
                </option>
              ))}
            </select>
            <select
              value={enrollmentForm.faculty}
              onChange={(e) =>
                setEnrollmentForm({
                  ...enrollmentForm,
                  faculty: e.target.value,
                })
              }
              required
              style={inputStyle}
            >
              <option value="">-- Faculte --</option>
              {faculties
                .filter((f) => f.is_active)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
            <select
              value={enrollmentForm.promotion}
              onChange={(e) =>
                setEnrollmentForm({
                  ...enrollmentForm,
                  promotion: e.target.value,
                })
              }
              required
              style={inputStyle}
            >
              <option value="">-- Promotion --</option>
              {promotions
                .filter(
                  (p) =>
                    p.is_active &&
                    (!enrollmentForm.faculty ||
                      String(p.faculty) === String(enrollmentForm.faculty)),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <select
              value={enrollmentForm.academic_year}
              onChange={(e) =>
                setEnrollmentForm({
                  ...enrollmentForm,
                  academic_year: e.target.value,
                })
              }
              required
              style={inputStyle}
            >
              <option value="">-- Annee academique --</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
            <button type="submit" style={primaryBtn}>
              Inscrire
            </button>
          </form>
          {enrollmentForm.promotion && (
            <p style={{ ...hintStyle, marginTop: 0 }}>
              {(() => {
                const selected = promotions.find(
                  (p) => String(p.id) === String(enrollmentForm.promotion),
                );
                if (!selected) return null;
                return `Validite de l'inscription : du ${selected.course_start_date} au ${selected.course_end_date}`;
              })()}
            </p>
          )}

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Etudiant</th>
                <th style={thStyle}>Faculte</th>
                <th style={thStyle}>Promotion</th>
                <th style={thStyle}>Annee</th>
                <th style={thStyle}>Validite debut</th>
                <th style={thStyle}>Validite fin</th>
                <th style={thStyle}>En periode</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Paiements</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <Fragment key={e.id}>
                  <tr>
                    <td style={tdStyle}>{e.student_name}</td>
                    <td style={tdStyle}>{e.faculty_name}</td>
                    <td style={tdStyle}>{e.promotion_name}</td>
                    <td style={tdStyle}>{e.academic_year_name}</td>
                    <td style={tdStyle}>{e.valid_from || "-"}</td>
                    <td style={tdStyle}>{e.valid_to || "-"}</td>
                    <td style={tdStyle}>{e.is_within_validity ? "Oui" : "Non"}</td>
                    <td style={tdStyle}>{e.is_active ? "Active" : "Terminee"}</td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        style={primaryBtn}
                        onClick={() => handleShowEnrollmentFinance(e.id)}
                      >
                        {expandedEnrollmentId === e.id ? "Masquer" : "Voir"}
                      </button>
                    </td>
                  </tr>
                  {expandedEnrollmentId === e.id && enrollmentFinance && (
                    <tr key={`${e.id}-finance`}>
                      <td colSpan={9} style={financeCell}>
                        <p>
                          Solde : <strong>{enrollmentFinance.balance_due} USD</strong> ·
                          Paye : {enrollmentFinance.total_paid} USD ·{" "}
                          {enrollmentFinance.is_in_good_standing ? "En regle" : "En retard"}
                        </p>
                        <table style={tableStyle}>
                          <thead>
                            <tr>
                              <th style={thStyle}>Tranche</th>
                              <th style={thStyle}>Montant</th>
                              <th style={thStyle}>Echeance</th>
                              <th style={thStyle}>Statut</th>
                              <th style={thStyle}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(enrollmentFinance.installments || []).map((item) => (
                              <tr key={item.installment_number}>
                                <td style={tdStyle}>{item.label}</td>
                                <td style={tdStyle}>{item.amount} USD</td>
                                <td style={tdStyle}>{item.due_date}</td>
                                <td style={tdStyle}>{item.status}</td>
                                <td style={tdStyle}>
                                  {item.status !== "paid" && (
                                    <button
                                      type="button"
                                      style={successBtn}
                                      onClick={() =>
                                        handleMarkInstallmentPaid(
                                          e.id,
                                          item.installment_number,
                                        )
                                      }
                                    >
                                      Marquer paye
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
      <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>
        {label}
      </div>
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

const hintStyle = {
  color: "#555",
  backgroundColor: "#f5f9ff",
  padding: "12px 16px",
  borderRadius: "8px",
  marginBottom: "16px",
  lineHeight: 1.5,
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

function defaultInstallments() {
  return [1, 2, 3, 4].map((number) => ({
    installment_number: number,
    label: `Tranche ${number}`,
    amount: "",
    due_date: "",
  }));
}

const tuitionPanel = {
  marginTop: "24px",
  padding: "16px",
  borderRadius: "10px",
  backgroundColor: "#fffbea",
  border: "1px solid #ffe082",
};

const installmentRow = {
  display: "grid",
  gridTemplateColumns: "100px 1fr 140px 160px",
  gap: "10px",
  alignItems: "center",
  marginBottom: "8px",
};

const financeCell = {
  padding: "14px",
  backgroundColor: "#fafbfd",
  borderBottom: "1px solid #eee",
};

export default Academics;
