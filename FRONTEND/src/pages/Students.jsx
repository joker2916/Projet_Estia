import { useState, useEffect } from "react";
import api from "../api/axios";

function Students({ embedded = false }) {
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    matricule: "",
    portal_password: "",
  });
  const [filters, setFilters] = useState({
    search: "",
    faculty_id: "",
    promotion_id: "",
    academic_year_id: "",
  });
  const [editId, setEditId] = useState(null);

  const fetchStudents = async () => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.faculty_id) params.faculty_id = filters.faculty_id;
    if (filters.promotion_id) params.promotion_id = filters.promotion_id;
    if (filters.academic_year_id)
      params.academic_year_id = filters.academic_year_id;

    const res = await api.get("students/", { params });
    setStudents(res.data);
  };

  useEffect(() => {
    let ignore = false;

    const loadLookups = async () => {
      const [fRes, pRes, yRes] = await Promise.all([
        api.get("faculties/", { params: { status: "active" } }),
        api.get("promotions/", { params: { status: "active" } }),
        api.get("academic-years/"),
      ]);
      if (ignore) return;
      setFaculties(fRes.data);
      setPromotions(pRes.data);
      setYears(yRes.data);
    };

    loadLookups();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadStudents = async () => {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.faculty_id) params.faculty_id = filters.faculty_id;
      if (filters.promotion_id) params.promotion_id = filters.promotion_id;
      if (filters.academic_year_id)
        params.academic_year_id = filters.academic_year_id;

      const res = await api.get("students/", { params });
      if (!ignore) {
        setStudents(res.data);
      }
    };

    loadStudents();

    return () => {
      ignore = true;
    };
  }, [
    filters.search,
    filters.faculty_id,
    filters.promotion_id,
    filters.academic_year_id,
  ]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await api.put(`students/${editId}/`, form);
    } else {
      await api.post("students/", form);
    }
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      matricule: "",
      portal_password: "",
    });
    setEditId(null);
    fetchStudents();
  };

  const handleEdit = (student) => {
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      matricule: student.matricule,
      portal_password: "",
    });
    setEditId(student.id);
  };

  const handleDelete = async (id) => {
    if (confirm("Supprimer cet étudiant ?")) {
      await api.delete(`students/${id}/`);
      fetchStudents();
    }
  };

  return (
    <div
      style={
        embedded
          ? {
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }
          : undefined
      }
    >
      {!embedded && <h1> Gestion des Étudiants</h1>}

      <p style={hintStyle}>
        Créez ici uniquement l&apos;identité de l&apos;étudiant (nom, matricule,
        accès portail). Pour l&apos;affecter à une faculté et une promotion,
        utilisez l&apos;onglet <strong>Inscriptions</strong>.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <input
          placeholder="Rechercher (nom, matricule, email)"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={inputStyle}
        />
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
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "10px",
          marginBottom: "30px",
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "10px",
        }}
      >
        <input
          name="first_name"
          placeholder="Prénom"
          value={form.first_name}
          onChange={handleChange}
          required
          style={inputStyle}
        />
        <input
          name="last_name"
          placeholder="Nom"
          value={form.last_name}
          onChange={handleChange}
          required
          style={inputStyle}
        />
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          style={inputStyle}
        />
        <input
          name="matricule"
          placeholder="Matricule"
          value={form.matricule}
          onChange={handleChange}
          required
          style={inputStyle}
        />
        <input
          name="portal_password"
          type="password"
          placeholder="Mot de passe portail étudiant"
          value={form.portal_password}
          onChange={handleChange}
          style={inputStyle}
        />
        <button
          type="submit"
          style={{
            gridColumn: "1 / -1",
            padding: "12px",
            backgroundColor: editId ? "#ff9800" : "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          {editId ? "✏️ Modifier" : " Ajouter l'étudiant"}
        </button>
      </form>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: "white",
          borderRadius: "10px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#1976d2", color: "white" }}>
            <th style={thStyle}>Matricule</th>
            <th style={thStyle}>Prénom</th>
            <th style={thStyle}>Nom</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Inscription active</th>
            <th style={thStyle}>Faculte</th>
            <th style={thStyle}>Promotion</th>
            <th style={thStyle}>Annee</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={tdStyle}>{s.matricule}</td>
              <td style={tdStyle}>{s.first_name}</td>
              <td style={tdStyle}>{s.last_name}</td>
              <td style={tdStyle}>{s.email}</td>
              <td style={tdStyle}>
                {s.enrollment_status === "active" ? "Oui" : "Non"}
              </td>
              <td style={tdStyle}>{s.faculty_name || "-"}</td>
              <td style={tdStyle}>{s.promotion_name || "-"}</td>
              <td style={tdStyle}>{s.academic_year_name || "-"}</td>
              <td style={tdStyle}>
                <button onClick={() => handleEdit(s)} style={btnEdit}>
                  Modifier
                </button>
                <button onClick={() => handleDelete(s.id)} style={btnDelete}>
                  Effacer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {students.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          Aucun étudiant enregistré.
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
const hintStyle = {
  color: "#555",
  backgroundColor: "#f5f9ff",
  padding: "12px 16px",
  borderRadius: "8px",
  marginBottom: "16px",
  lineHeight: 1.5,
};
const thStyle = { padding: "12px", textAlign: "left" };
const tdStyle = { padding: "10px" };
const btnEdit = {
  marginRight: "5px",
  padding: "5px 10px",
  cursor: "pointer",
  border: "none",
  backgroundColor: "#ff9800",
  color: "white",
  borderRadius: "4px",
};
const btnDelete = {
  padding: "5px 10px",
  cursor: "pointer",
  border: "none",
  backgroundColor: "#d32f2f",
  color: "white",
  borderRadius: "4px",
};

export default Students;
