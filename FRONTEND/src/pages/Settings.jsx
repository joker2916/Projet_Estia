import { useState, useEffect } from "react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import ContentCard from "../components/ContentCard";

function Settings() {
  // --- Info générale ---
  const [universityName, setUniversityName] = useState("");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // --- Professeurs ---
  const [professors, setProfessors] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [newProfessor, setNewProfessor] = useState({
    username: "",
    email: "",
    password: "prof123",
    promotion_ids: [],
  });

  // --- Règles d'accès ---
  const [accessStart, setAccessStart] = useState("07:00");
  const [accessEnd, setAccessEnd] = useState("18:00");
  const [lateThresholdMinutes, setLateThresholdMinutes] = useState(15);
  const [blockUnpaidFees, setBlockUnpaidFees] = useState(true);

  // --- Notifications ---
  const [emailAdmin, setEmailAdmin] = useState("");
  const [notifyAccessDenied, setNotifyAccessDenied] = useState(true);
  const [notifyExpiredCard, setNotifyExpiredCard] = useState(true);
  const [notifyDisabledCard, setNotifyDisabledCard] = useState(true);
  const [notifyUnpaidFees, setNotifyUnpaidFees] = useState(false);

  // --- UI ---
  const [activeSection, setActiveSection] = useState("general");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ========== CHARGEMENT DES DONNÉES ==========
  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    setLoading(true);
    try {
      const [uniRes, professorsRes, promotionsRes, accessRes, notifRes] =
        await Promise.all([
          api.get("settings/university/"),
          api.get("settings/professors/"),
          api.get("promotions/", { params: { status: "active" } }),
          api.get("settings/access/"),
          api.get("settings/notifications/"),
        ]);

      setUniversityName(uniRes.data.name || "");
      if (uniRes.data.logo) setLogoPreview(uniRes.data.logo);

      setProfessors(professorsRes.data);
      setPromotions(promotionsRes.data);

      // Accès
      setAccessStart(accessRes.data.access_start);
      setAccessEnd(accessRes.data.access_end);
      setLateThresholdMinutes(accessRes.data.late_threshold_minutes);
      setBlockUnpaidFees(accessRes.data.block_unpaid_fees);

      // Notifications
      setEmailAdmin(notifRes.data.email_admin);
      setNotifyAccessDenied(notifRes.data.notify_access_denied);
      setNotifyExpiredCard(notifRes.data.notify_expired_card);
      setNotifyDisabledCard(notifRes.data.notify_disabled_card);
      setNotifyUnpaidFees(notifRes.data.notify_unpaid_fees);
    } catch (err) {
      console.error("Erreur chargement paramètres:", err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  // ========== HANDLERS ==========

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveGeneral = async () => {
    try {
      const formData = new FormData();
      formData.append("name", universityName);
      if (logo) formData.append("logo", logo);

      await api.put("settings/university/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showMessage(" Info générale sauvegardée !");
    } catch {
      showMessage(" Erreur de sauvegarde");
    }
  };

  const handleSaveAccess = async () => {
    try {
      await api.put("settings/access/", {
        access_start: accessStart,
        access_end: accessEnd,
        late_threshold_minutes: lateThresholdMinutes,
        block_unpaid_fees: blockUnpaidFees,
      });
      showMessage(" Règles d'accès sauvegardées !");
    } catch {
      showMessage(" Erreur sauvegarde règles d'accès");
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await api.put("settings/notifications/", {
        email_admin: emailAdmin,
        notify_access_denied: notifyAccessDenied,
        notify_expired_card: notifyExpiredCard,
        notify_disabled_card: notifyDisabledCard,
        notify_unpaid_fees: notifyUnpaidFees,
      });
      showMessage(" Notifications sauvegardées !");
    } catch {
      showMessage(" Erreur sauvegarde notifications");
    }
  };

  const handleAddProfessor = async () => {
    if (!newProfessor.username.trim()) {
      showMessage("Nom utilisateur professeur requis");
      return;
    }
    try {
      const res = await api.post("settings/professors/", {
        username: newProfessor.username.trim(),
        email: newProfessor.email.trim(),
        password: newProfessor.password,
        promotion_ids: newProfessor.promotion_ids.map(Number),
        active: true,
      });
      setProfessors([...professors, res.data]);
      setNewProfessor({
        username: "",
        email: "",
        password: "prof123",
        promotion_ids: [],
      });
      showMessage("Professeur ajouté");
    } catch {
      showMessage("Erreur création professeur");
    }
  };

  const tabs = [
    { key: "general", label: " Info Générale" },
    { key: "users", label: " Professeurs" },
    { key: "access", label: " Règles d'Accès" },
    { key: "notifications", label: " Notifications" },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <h2> Chargement des paramètres...</h2>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Paramètres"
        subtitle="Configuration générale, gouvernance des accès et alertes système."
      />

      {/* Message de confirmation */}
      {message && (
        <div
          style={{
            padding: "12px 20px",
            borderRadius: "8px",
            marginBottom: "20px",
            backgroundColor: message.includes("✅") ? "#e8f5e9" : "#ffebee",
            color: message.includes("✅") ? "#2e7d32" : "#c62828",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {message}
        </div>
      )}

      {/* Onglets */}
      <div
        style={{
          display: "flex",
          gap: "5px",
          marginBottom: "25px",
          borderBottom: "2px solid #e0e0e0",
          paddingBottom: "0",
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            style={{
              padding: "12px 20px",
              border: "none",
              borderBottom:
                activeSection === tab.key
                  ? "3px solid #1976d2"
                  : "3px solid transparent",
              backgroundColor:
                activeSection === tab.key ? "#e3f2fd" : "transparent",
              color: activeSection === tab.key ? "#1976d2" : "#777",
              fontWeight: activeSection === tab.key ? "bold" : "normal",
              fontSize: "14px",
              cursor: "pointer",
              borderRadius: "8px 8px 0 0",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== INFO GÉNÉRALE ========== */}
      {activeSection === "general" && (
        <ContentCard padding="30px" style={sectionCard}>
          <h2 style={sectionTitle}> Information Générale</h2>
          <p style={sectionDesc}>
            Informations de l'établissement universitaire
          </p>

          <div style={fieldGroup}>
            <label style={labelStyle}>Nom de l'Université</label>
            <input
              type="text"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Logo de l'Université</label>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "contain",
                    borderRadius: "12px",
                    border: "2px solid #e0e0e0",
                    padding: "5px",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "12px",
                    border: "2px dashed #ccc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "40px",
                    color: "#ccc",
                  }}
                ></div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  id="logo-upload"
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="logo-upload"
                  style={{
                    ...btnPrimary,
                    display: "inline-block",
                    cursor: "pointer",
                    padding: "10px 20px",
                    fontSize: "14px",
                  }}
                >
                  {" "}
                  Choisir un logo
                </label>
                <p
                  style={{ color: "#999", fontSize: "12px", marginTop: "5px" }}
                >
                  PNG, JPG — Max 2MB
                </p>
              </div>
            </div>
          </div>

          <button onClick={handleSaveGeneral} style={btnSave}>
            {" "}
            Sauvegarder
          </button>
        </ContentCard>
      )}

      {/* ========== UTILISATEURS & RÔLES ========== */}
      {activeSection === "users" && (
        <ContentCard padding="30px" style={sectionCard}>
          <h2 style={sectionTitle}> Gestion des professeurs</h2>
          <p style={sectionDesc}>
            Creez des comptes professeur et affectez-les a une ou plusieurs
            promotions.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 2fr auto",
              gap: "10px",
              marginBottom: "15px",
            }}
          >
            <input
              type="text"
              placeholder="Nom utilisateur"
              value={newProfessor.username}
              onChange={(e) =>
                setNewProfessor({ ...newProfessor, username: e.target.value })
              }
              style={inputStyle}
            />
            <input
              type="email"
              placeholder="Email"
              value={newProfessor.email}
              onChange={(e) =>
                setNewProfessor({ ...newProfessor, email: e.target.value })
              }
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Mot de passe"
              value={newProfessor.password}
              onChange={(e) =>
                setNewProfessor({ ...newProfessor, password: e.target.value })
              }
              style={inputStyle}
            />
            <select
              multiple
              value={newProfessor.promotion_ids}
              onChange={(e) =>
                setNewProfessor({
                  ...newProfessor,
                  promotion_ids: Array.from(e.target.selectedOptions).map(
                    (option) => option.value,
                  ),
                })
              }
              style={{ ...inputStyle, minHeight: "90px" }}
            >
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>
                  {promotion.name} / {promotion.faculty_name}
                </option>
              ))}
            </select>
            <button onClick={handleAddProfessor} style={btnPrimary}>
              Ajouter
            </button>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Professeur</th>
                <th style={thStyle}>Promotions affectées</th>
                <th style={thStyle}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {professors.map((professor) => (
                <tr key={professor.id}>
                  <td style={tdStyle}>{professor.username}</td>
                  <td style={tdStyle}>
                    {professor.promotion_details
                      .map((promotion) => promotion.name)
                      .join(", ") || "-"}
                  </td>
                  <td style={tdStyle}>{professor.active ? "Actif" : "Inactif"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ContentCard>
      )}

      {/* ========== RÈGLES D'ACCÈS ========== */}
      {activeSection === "access" && (
        <ContentCard padding="30px" style={sectionCard}>
          <h2 style={sectionTitle}> Règles d'Accès</h2>
          <p style={sectionDesc}>
            Définir les horaires, retards et conditions d'accès
          </p>

          <h3 style={subTitle}> Horaires d'Accès Autorisés</h3>
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Heure de début</label>
              <input
                type="time"
                value={accessStart}
                onChange={(e) => setAccessStart(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Heure de fin</label>
              <input
                type="time"
                value={accessEnd}
                onChange={(e) => setAccessEnd(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#e8f5e9",
              borderRadius: "10px",
              padding: "15px",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            Accès autorisé de <strong>{accessStart}</strong> à{" "}
            <strong>{accessEnd}</strong>
          </div>

          <h3 style={subTitle}> Seuil de Retard</h3>
          <div style={fieldGroup}>
            <label style={labelStyle}>Tolérance de retard (minutes)</label>
            <input
              type="number"
              value={lateThresholdMinutes}
              onChange={(e) => setLateThresholdMinutes(Number(e.target.value))}
              min={0}
              max={60}
              style={inputStyle}
            />
            <span style={helpText}>
              Au-delà de {lateThresholdMinutes} min, le pointage sera "en
              retard"
            </span>
          </div>

          <h3 style={subTitle}> Blocage Frais Académiques</h3>
          <div style={fieldGroup}>
            <label
              style={{
                ...labelStyle,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <input
                type="checkbox"
                checked={blockUnpaidFees}
                onChange={(e) => setBlockUnpaidFees(e.target.checked)}
                style={{ width: "18px", height: "18px" }}
              />
              Bloquer l'accès aux étudiants avec frais impayés
            </label>
            <span style={helpText}>
              {blockUnpaidFees
                ? " Les étudiants non en ordre seront refusés"
                : " Tous les étudiants auront accès"}
            </span>
          </div>

          <button onClick={handleSaveAccess} style={btnSave}>
            {" "}
            Sauvegarder
          </button>
        </ContentCard>
      )}

      {/* ========== NOTIFICATIONS ========== */}
      {activeSection === "notifications" && (
        <ContentCard padding="30px" style={sectionCard}>
          <h2 style={sectionTitle}> Notifications & Alertes</h2>
          <p style={sectionDesc}>
            Configurer les alertes automatiques du système
          </p>

          <div style={fieldGroup}>
            <label style={labelStyle}>Email de l'Administration</label>
            <input
              type="email"
              value={emailAdmin}
              onChange={(e) => setEmailAdmin(e.target.value)}
              style={inputStyle}
              placeholder="yannbanga17@gmail.com"
            />
          </div>

          <h3 style={subTitle}> Types d'Alertes</h3>

          {[
            {
              label: " Accès refusé",
              desc: "Notifier quand un accès est refusé",
              value: notifyAccessDenied,
              setter: setNotifyAccessDenied,
            },
            {
              label: " Carte expirée",
              desc: "Alerter quand une carte expirée est utilisée",
              value: notifyExpiredCard,
              setter: setNotifyExpiredCard,
            },
            {
              label: " Carte désactivée",
              desc: "Alerter quand une carte désactivée est badgée",
              value: notifyDisabledCard,
              setter: setNotifyDisabledCard,
            },
            {
              label: " Frais impayés",
              desc: "Notifier quand un étudiant avec frais impayés tente d'accéder",
              value: notifyUnpaidFees,
              setter: setNotifyUnpaidFees,
            },
          ].map((item, idx) => (
            <div key={idx} style={toggleCard}>
              <div>
                <strong>{item.label}</strong>
                <p
                  style={{ margin: "5px 0 0", color: "#777", fontSize: "13px" }}
                >
                  {item.desc}
                </p>
              </div>
              <label style={switchLabel}>
                <input
                  type="checkbox"
                  checked={item.value}
                  onChange={(e) => item.setter(e.target.checked)}
                  style={{ display: "none" }}
                />
                <span style={switchTrack(item.value)}>
                  <span style={switchThumb(item.value)} />
                </span>
              </label>
            </div>
          ))}

          <button onClick={handleSaveNotifications} style={btnSave}>
            {" "}
            Sauvegarder
          </button>
        </ContentCard>
      )}
    </div>
  );
}

// ========== STYLES ==========
const sectionCard = {
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  borderRadius: "12px",
};
const sectionTitle = { color: "#1976d2", marginTop: 0, marginBottom: "5px" };
const sectionDesc = {
  color: "#999",
  marginTop: 0,
  marginBottom: "25px",
  fontSize: "14px",
};
const subTitle = {
  color: "#333",
  fontSize: "16px",
  marginBottom: "15px",
  paddingBottom: "8px",
  borderBottom: "2px solid #e3f2fd",
};
const fieldGroup = { marginBottom: "20px" };
const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "bold",
  color: "#555",
  fontSize: "14px",
};
const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "14px",
  boxSizing: "border-box",
};
const helpText = {
  display: "block",
  marginTop: "5px",
  fontSize: "12px",
  color: "#999",
};
const btnPrimary = {
  backgroundColor: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "12px 20px",
  fontSize: "14px",
  fontWeight: "bold",
  cursor: "pointer",
};
const btnSave = {
  backgroundColor: "#2e7d32",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "14px 30px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "25px",
  width: "100%",
};
const btnSmall = {
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: "bold",
  cursor: "pointer",
};
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
};
const thStyle = {
  textAlign: "left",
  padding: "12px",
  backgroundColor: "#f5f5f5",
  borderBottom: "2px solid #e0e0e0",
  color: "#555",
  fontSize: "13px",
  fontWeight: "bold",
};
const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #f0f0f0",
  verticalAlign: "middle",
};
const toggleCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#f9f9f9",
  borderRadius: "10px",
  padding: "15px 20px",
  marginBottom: "10px",
  border: "1px solid #e0e0e0",
};
const switchLabel = { cursor: "pointer", flexShrink: 0 };
const switchTrack = (active) => ({
  display: "block",
  width: "50px",
  height: "26px",
  borderRadius: "13px",
  backgroundColor: active ? "#4caf50" : "#ccc",
  position: "relative",
  transition: "background-color 0.3s",
});
const switchThumb = (active) => ({
  display: "block",
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  backgroundColor: "white",
  position: "absolute",
  top: "2px",
  left: active ? "26px" : "2px",
  transition: "left 0.3s",
  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
});

export default Settings;
