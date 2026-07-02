import { useState, useEffect } from "react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import ContentCard from "../components/ContentCard";

function Cards() {
  const [cards, setCards] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [form, setForm] = useState({ uid: "", enrollment: "" });
  const [editId, setEditId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [promotionFilter, setPromotionFilter] = useState("");

  const fetchCards = async () => {
    const res = await api.get("cards/", {
      params: {
        status: statusFilter,
        search: search || undefined,
        faculty_id: facultyFilter || undefined,
        promotion_id: promotionFilter || undefined,
      },
    });
    setCards(res.data);
  };

  useEffect(() => {
    let ignore = false;

    const loadCards = async () => {
      const res = await api.get("cards/", {
        params: {
          status: statusFilter,
          search: search || undefined,
          faculty_id: facultyFilter || undefined,
          promotion_id: promotionFilter || undefined,
        },
      });
      if (!ignore) {
        setCards(res.data);
      }
    };

    loadCards();

    return () => {
      ignore = true;
    };
  }, [statusFilter, search, facultyFilter, promotionFilter]);

  useEffect(() => {
    let ignore = false;

    const loadLookups = async () => {
      const [enrollmentRes, facultyRes, promotionRes] =
        await Promise.all([
          api.get("enrollments/", { params: { status: "active" } }),
          api.get("faculties/", { params: { status: "active" } }),
          api.get("promotions/", { params: { status: "active" } }),
        ]);
      if (ignore) return;
      setEnrollments(enrollmentRes.data);
      setFaculties(facultyRes.data);
      setPromotions(promotionRes.data);
    };

    loadLookups();

    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      uid: form.uid,
      enrollment: form.enrollment || null,
    };
    if (editId) {
      await api.put(`cards/${editId}/`, data);
    } else {
      await api.post("cards/", data);
    }
    setForm({ uid: "", enrollment: "" });
    setEditId(null);
    fetchCards();
  };

  const handleEdit = (card) => {
    setForm({
      uid: card.uid,
      enrollment: card.enrollment || "",
    });
    setEditId(card.id);
  };

  const handleDeactivate = async (id) => {
    if (confirm("Désactiver cette carte ?")) {
      await api.post(`cards/${id}/deactivate/`);
      if (editId === id) {
        setEditId(null);
        setForm({ uid: "", enrollment: "" });
      }
      fetchCards();
    }
  };

  const handleReactivate = async (id) => {
    await api.post(`cards/${id}/reactivate/`);
    fetchCards();
  };

  return (
    <div>
      <PageHeader
        title="Gestion des Cartes RFID"
        subtitle="Création, attribution, suivi de statut et cycle de vie des cartes."
      />

      <ContentCard
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <input
          placeholder="Recherche UUID, UID, nom, matricule"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
        <select
          value={facultyFilter}
          onChange={(e) => {
            setFacultyFilter(e.target.value);
            setPromotionFilter("");
          }}
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
          value={promotionFilter}
          onChange={(e) => setPromotionFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="">Toutes les promotions</option>
          {promotions
            .filter(
              (p) =>
                !facultyFilter || String(p.faculty) === String(facultyFilter),
            )
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </ContentCard>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <label style={{ fontWeight: "bold", color: "#555" }}>
          Filtre statut :
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, maxWidth: "220px", flex: "none" }}
        >
          <option value="active">Actives</option>
          <option value="disabled">Desactivees</option>
          <option value="lost">Perdues</option>
          <option value="expired">Expirees</option>
          <option value="all">Toutes</option>
        </select>
      </div>

      <ContentCard padding="20px" style={{ marginBottom: "30px" }}>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <input
            placeholder="UID de la carte"
            value={form.uid}
            onChange={(e) => setForm({ ...form, uid: e.target.value })}
            required
            style={inputStyle}
          />
          <select
            value={form.enrollment}
            onChange={(e) => setForm({ ...form, enrollment: e.target.value })}
            required
            style={inputStyle}
          >
            <option value="">-- Inscription active --</option>
            {enrollments.map((enr) => (
              <option key={enr.id} value={enr.id}>
                {enr.student_name} / {enr.promotion_name} /{" "}
                {enr.academic_year_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              padding: "12px 20px",
              backgroundColor: editId ? "#ff9800" : "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            {editId ? " Modifier" : " Ajouter"}
          </button>
        </form>
      </ContentCard>

      <ContentCard padding="0" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#1976d2", color: "white" }}>
              <th style={thStyle}>UUID</th>
              <th style={thStyle}>UID</th>
              <th style={thStyle}>Étudiant assigné</th>
              <th style={thStyle}>Faculte</th>
              <th style={thStyle}>Promotion</th>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}>Derniere utilisation</th>
              <th style={thStyle}>Total usages</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{c.card_uuid}</td>
                <td style={tdStyle}>{c.uid}</td>
                <td style={tdStyle}>{c.student_name}</td>
                <td style={tdStyle}>{c.faculty_name || "-"}</td>
                <td style={tdStyle}>{c.promotion_name || "-"}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor:
                        c.status === "active" ? "#e8f5e9" : "#ffebee",
                      color: c.status === "active" ? "#2e7d32" : "#c62828",
                    }}
                  >
                    {c.status || "active"}
                  </span>
                </td>
                <td style={tdStyle}>
                  {c.last_used_at
                    ? new Date(c.last_used_at).toLocaleString()
                    : "-"}
                </td>
                <td style={tdStyle}>{c.total_uses ?? 0}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleEdit(c)}
                    style={btnEdit}
                    disabled={c.status !== "active"}
                  >
                    Modifier
                  </button>
                  {c.status === "active" ? (
                    <button
                      onClick={() => handleDeactivate(c.id)}
                      style={btnDeactivate}
                    >
                      Désactiver
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(c.id)}
                      style={btnReactivate}
                    >
                      Réactiver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ContentCard>

      {cards.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          Aucune carte enregistrée.
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
  flex: 1,
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
const btnDeactivate = {
  padding: "5px 10px",
  cursor: "pointer",
  border: "none",
  backgroundColor: "#d32f2f",
  color: "white",
  borderRadius: "4px",
};
const btnReactivate = {
  padding: "5px 10px",
  cursor: "pointer",
  border: "none",
  backgroundColor: "#2e7d32",
  color: "white",
  borderRadius: "4px",
};

export default Cards;
