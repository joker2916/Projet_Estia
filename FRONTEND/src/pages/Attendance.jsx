import { useState, useEffect } from "react";
import api from "../api/axios";

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [filterDate, setFilterDate] = useState("");

  const fetchAttendance = async () => {
    const res = await api.get("attendance/");
    setAttendance(res.data);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const filtered = filterDate
    ? attendance.filter((a) => a.date === filterDate)
    : attendance;

  return (
    <div>
      <h1>📋 Historique des Présences</h1>

      <div style={{
        display: "flex",
        gap: "10px",
        marginBottom: "20px",
        alignItems: "center",
        backgroundColor: "white",
        padding: "15px",
        borderRadius: "10px",
      }}>
        <label>📅 Filtrer par date :</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={inputStyle}
        />
        <button
          onClick={() => setFilterDate("")}
          style={{
            padding: "10px 15px",
            backgroundColor: "#757575",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          🔄 Réinitialiser
        </button>
      </div>

      <div style={{
        backgroundColor: "white",
        padding: "10px",
        borderRadius: "10px",
        marginBottom: "15px",
        textAlign: "center",
        fontSize: "18px",
        fontWeight: "bold",
        color: "#1976d2",
      }}>
        Total : {filtered.length} présence(s)
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "10px" }}>
        <thead>
          <tr style={{ backgroundColor: "#1976d2", color: "white" }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Étudiant</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Heure</th>
            <th style={thStyle}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((a, index) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={tdStyle}>{index + 1}</td>
              <td style={tdStyle}>{a.student_name}</td>
              <td style={tdStyle}>{a.date}</td>
              <td style={tdStyle}>{a.time}</td>
              <td style={tdStyle}>
                <span style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  backgroundColor: a.status === "Présent" ? "#4caf50" : "#f44336",
                  color: "white",
                  fontSize: "13px",
                }}>
                  {a.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", marginTop: "20px" }}>Aucune présence enregistrée.</p>
      )}
    </div>
  );
}

const inputStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "14px" };
const thStyle = { padding: "12px", textAlign: "left" };
const tdStyle = { padding: "10px" };

export default Attendance;
