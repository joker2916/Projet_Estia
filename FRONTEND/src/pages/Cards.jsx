import { useState, useEffect } from "react";
import api from "../api/axios";

function Cards() {
  const [cards, setCards] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ uid: "", student: "" });
  const [editId, setEditId] = useState(null);

  const fetchCards = async () => {
    const res = await api.get("cards/");
    setCards(res.data);
  };

  const fetchStudents = async () => {
    const res = await api.get("students/");
    setStudents(res.data);
  };

  useEffect(() => {
    fetchCards();
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { uid: form.uid, student: form.student || null };
    if (editId) {
      await api.put(`cards/${editId}/`, data);
    } else {
      await api.post("cards/", data);
    }
    setForm({ uid: "", student: "" });
    setEditId(null);
    fetchCards();
  };

  const handleEdit = (card) => {
    setForm({ uid: card.uid, student: card.student || "" });
    setEditId(card.id);
  };

  const handleDelete = async (id) => {
    if (confirm("Supprimer cette carte ?")) {
      await api.delete(`cards/${id}/`);
      fetchCards();
    }
  };

  return (
    <div>
      <h1> Gestion des Cartes RFID</h1>

      <form onSubmit={handleSubmit} style={{
        display: "flex",
        gap: "10px",
        marginBottom: "30px",
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "10px",
        alignItems: "center",
      }}>
        <input
          placeholder="UID de la carte"
          value={form.uid}
          onChange={(e) => setForm({ ...form, uid: e.target.value })}
          required
          style={inputStyle}
        />
        <select
          value={form.student}
          onChange={(e) => setForm({ ...form, student: e.target.value })}
          style={inputStyle}
        >
          <option value="">-- Aucun étudiant --</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.first_name} {s.last_name} ({s.matricule})
            </option>
          ))}
        </select>
        <button type="submit" style={{
          padding: "12px 20px",
          backgroundColor: editId ? "#ff9800" : "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}>
          {editId ? " Modifier" : " Ajouter"}
        </button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "10px" }}>
        <thead>
          <tr style={{ backgroundColor: "#1976d2", color: "white" }}>
            <th style={thStyle}>UID</th>
            <th style={thStyle}>Étudiant assigné</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={tdStyle}>{c.uid}</td>
              <td style={tdStyle}>{c.student_name}</td>
              <td style={tdStyle}>
                <button onClick={() => handleEdit(c)} style={btnEdit}>✏️</button>
                <button onClick={() => handleDelete(c.id)} style={btnDelete}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {cards.length === 0 && <p style={{ textAlign: "center", marginTop: "20px" }}>Aucune carte enregistrée.</p>}
    </div>
  );
}

const inputStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px", flex: 1 };
const thStyle = { padding: "12px", textAlign: "left" };
const tdStyle = { padding: "10px" };
const btnEdit = { marginRight: "5px", padding: "5px 10px", cursor: "pointer", border: "none", backgroundColor: "#ff9800", color: "white", borderRadius: "4px" };
const btnDelete = { padding: "5px 10px", cursor: "pointer", border: "none", backgroundColor: "#d32f2f", color: "white", borderRadius: "4px" };

export default Cards;
