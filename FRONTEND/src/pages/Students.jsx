import { useState, useEffect } from "react";
import api from "../api/axios";

function Students() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    matricule: "",
    filiere: "",
    niveau: "",
  });
  const [editId, setEditId] = useState(null);

  const fetchStudents = async () => {
    const res = await api.get("students/");
    setStudents(res.data);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

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
    setForm({ first_name: "", last_name: "", email: "", matricule: "", filiere: "", niveau: "" });
    setEditId(null);
    fetchStudents();
  };

  const handleEdit = (student) => {
    setForm({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      matricule: student.matricule,
      filiere: student.filiere,
      niveau: student.niveau,
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
    <div>
      <h1> Gestion des Étudiants</h1>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px",
        marginBottom: "30px",
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "10px",
      }}>
        <input name="first_name" placeholder="Prénom" value={form.first_name} onChange={handleChange} required style={inputStyle} />
        <input name="last_name" placeholder="Nom" value={form.last_name} onChange={handleChange} required style={inputStyle} />
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required style={inputStyle} />
        <input name="matricule" placeholder="Matricule" value={form.matricule} onChange={handleChange} required style={inputStyle} />
        <input name="filiere" placeholder="Filière" value={form.filiere} onChange={handleChange} required style={inputStyle} />
        <input name="niveau" placeholder="Niveau (L1, L2...)" value={form.niveau} onChange={handleChange} required style={inputStyle} />
        <button type="submit" style={{
          gridColumn: "1 / -1",
          padding: "12px",
          backgroundColor: editId ? "#ff9800" : "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
        }}>
          {editId ? "✏️ Modifier" : " Ajouter"}
        </button>
      </form>

      {/* Tableau */}
      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "10px" }}>
        <thead>
          <tr style={{ backgroundColor: "#1976d2", color: "white" }}>
            <th style={thStyle}>Matricule</th>
            <th style={thStyle}>Prénom</th>
            <th style={thStyle}>Nom</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Filière</th>
            <th style={thStyle}>Niveau</th>
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
              <td style={tdStyle}>{s.filiere}</td>
              <td style={tdStyle}>{s.niveau}</td>
              <td style={tdStyle}>
                <button onClick={() => handleEdit(s)} style={btnEdit}>Modifier</button>
                <button onClick={() => handleDelete(s.id)} style={btnDelete}>Effacer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {students.length === 0 && <p style={{ textAlign: "center", marginTop: "20px" }}>Aucun étudiant enregistré.</p>}
    </div>
  );
}

const inputStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px" };
const thStyle = { padding: "12px", textAlign: "left" };
const tdStyle = { padding: "10px" };
const btnEdit = { marginRight: "5px", padding: "5px 10px", cursor: "pointer", border: "none", backgroundColor: "#ff9800", color: "white", borderRadius: "4px" };
const btnDelete = { padding: "5px 10px", cursor: "pointer", border: "none", backgroundColor: "#d32f2f", color: "white", borderRadius: "4px" };

export default Students;
