import { useState, useEffect } from "react";
import api from "../api/axios";

function Settings() {
  // --- Info générale ---
  const [universityName, setUniversityName] = useState("");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // --- Utilisateurs & Rôles ---
  const [roles, setRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [users, setUsers] = useState([]);

  // --- RFID ---
  const [uidLength, setUidLength] = useState(8);
  const [maxCardsPerStudent, setMaxCardsPerStudent] = useState(1);
  const [cardValidityDays, setCardValidityDays] = useState(365);
  const [cardAutoDisable, setCardAutoDisable] = useState(true);

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
      const [uniRes, rolesRes, usersRes, rfidRes, accessRes, notifRes] = await Promise.all([
        api.get("settings/university/"),
        api.get("settings/roles/"),
        api.get("settings/users/"),
        api.get("settings/rfid/"),
        api.get("settings/access/"),
        api.get("settings/notifications/"),
      ]);

      // Info générale
      setUniversityName(uniRes.data.name || "");
      if (uniRes.data.logo) setLogoPreview(uniRes.data.logo);

      // Rôles & Utilisateurs
      setRoles(rolesRes.data);
      setUsers(usersRes.data);

      // RFID
      setUidLength(rfidRes.data.uid_length);
      setMaxCardsPerStudent(rfidRes.data.max_cards_per_student);
      setCardValidityDays(rfidRes.data.card_validity_days);
      setCardAutoDisable(rfidRes.data.card_auto_disable);

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
    } catch (err) {
      showMessage(" Erreur de sauvegarde");
    }
  };

  const handleAddRole = async () => {
    if (newRoleName.trim()) {
      try {
        const res = await api.post("settings/roles/", {
          name: newRoleName.trim(),
          permissions: [],
          active: true,
        });
        setRoles([...roles, res.data]);
        setNewRoleName("");
        showMessage(" Rôle ajouté !");
      } catch (err) {
        showMessage(" Erreur: ce rôle existe peut-être déjà");
      }
    }
  };

  const handleToggleRole = async (roleId) => {
    const role = roles.find(r => r.id === roleId);
    try {
      const res = await api.put(`settings/roles/${roleId}/`, {
        ...role,
        active: !role.active,
      });
      setRoles(roles.map(r => r.id === roleId ? res.data : r));
      showMessage(" Rôle mis à jour !");
    } catch (err) {
      showMessage(" Erreur mise à jour rôle");
    }
  };

  const handleTogglePermission = async (roleId, permission) => {
    const role = roles.find(r => r.id === roleId);
    const has = role.permissions.includes(permission);
    const newPermissions = has
      ? role.permissions.filter(p => p !== permission)
      : [...role.permissions, permission];

    try {
      const res = await api.put(`settings/roles/${roleId}/`, {
        ...role,
        permissions: newPermissions,
      });
      setRoles(roles.map(r => r.id === roleId ? res.data : r));
    } catch (err) {
      showMessage(" Erreur mise à jour permissions");
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      const res = await api.put(`settings/users/${userId}/toggle/`);
      setUsers(users.map(u => u.id === userId ? { ...u, active: res.data.active } : u));
      showMessage(" Statut utilisateur mis à jour !");
    } catch (err) {
      showMessage(" Erreur mise à jour utilisateur");
    }
  };

  const handleResetPassword = async (userId, username) => {
    const newPassword = prompt(`Nouveau mot de passe pour ${username} :`);
    if (newPassword) {
      try {
        await api.post(`settings/users/${userId}/reset-password/`, {
          password: newPassword,
        });
        showMessage(` Mot de passe de ${username} réinitialisé !`);
      } catch (err) {
        showMessage(" Erreur réinitialisation mot de passe");
      }
    }
  };

  const handleSaveRFID = async () => {
    try {
      await api.put("settings/rfid/", {
        uid_length: uidLength,
        max_cards_per_student: maxCardsPerStudent,
        card_validity_days: cardValidityDays,
        card_auto_disable: cardAutoDisable,
      });
      showMessage(" Paramètres RFID sauvegardés !");
    } catch (err) {
      showMessage(" Erreur sauvegarde RFID");
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
    } catch (err) {
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
    } catch (err) {
      showMessage(" Erreur sauvegarde notifications");
    }
  };

  const allPermissions = [
    "tout_accès",
    "gestion_utilisateurs",
    "paramètres",
    "voir_pointages",
    "voir_étudiants",
    "gérer_cartes",
    "voir_propre_pointage",
  ];

  const tabs = [
    { key: "general", label: " Info Générale" },
    { key: "users", label: " Utilisateurs & Rôles" },
    { key: "rfid", label: " RFID / Cartes" },
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
      <h1 style={{ color: "#1976d2", marginTop: 0 }}> Paramètres</h1>

      {/* Message de confirmation */}
      {message && (
        <div style={{
          padding: "12px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
          backgroundColor: message.includes("✅") ? "#e8f5e9" : "#ffebee",
          color: message.includes("✅") ? "#2e7d32" : "#c62828",
          fontWeight: "bold",
          textAlign: "center",
        }}>
          {message}
        </div>
      )}

      {/* Onglets */}
      <div style={{
        display: "flex",
        gap: "5px",
        marginBottom: "25px",
        borderBottom: "2px solid #e0e0e0",
        paddingBottom: "0",
        flexWrap: "wrap",
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            style={{
              padding: "12px 20px",
              border: "none",
              borderBottom: activeSection === tab.key ? "3px solid #1976d2" : "3px solid transparent",
              backgroundColor: activeSection === tab.key ? "#e3f2fd" : "transparent",
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
        <div style={sectionCard}>
          <h2 style={sectionTitle}> Information Générale</h2>
          <p style={sectionDesc}>Informations de l'établissement universitaire</p>

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
                <img src={logoPreview} alt="Logo" style={{
                  width: "100px", height: "100px", objectFit: "contain",
                  borderRadius: "12px", border: "2px solid #e0e0e0", padding: "5px",
                }} />
              ) : (
                <div style={{
                  width: "100px", height: "100px", borderRadius: "12px",
                  border: "2px dashed #ccc", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "40px", color: "#ccc",
                }}></div>
              )}
              <div>
                <input type="file" accept="image/*" onChange={handleLogoChange}
                  id="logo-upload" style={{ display: "none" }} />
                <label htmlFor="logo-upload" style={{
                  ...btnPrimary, display: "inline-block", cursor: "pointer",
                  padding: "10px 20px", fontSize: "14px",
                }}> Choisir un logo</label>
                <p style={{ color: "#999", fontSize: "12px", marginTop: "5px" }}>PNG, JPG — Max 2MB</p>
              </div>
            </div>
          </div>

          <button onClick={handleSaveGeneral} style={btnSave}> Sauvegarder</button>
        </div>
      )}

      {/* ========== UTILISATEURS & RÔLES ========== */}
      {activeSection === "users" && (
        <div style={sectionCard}>
          <h2 style={sectionTitle}>👥 Gestion des Utilisateurs & Rôles</h2>
          <p style={sectionDesc}>Gérer les rôles, permissions et accès des utilisateurs</p>

          <h3 style={subTitle}> Rôles & Permissions</h3>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input type="text" placeholder="Nouveau rôle..." value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
            <button onClick={handleAddRole} style={btnPrimary}>+ Ajouter</button>
          </div>

          {roles.map(role => (
            <div key={role.id} style={{
              backgroundColor: role.active ? "#f9f9f9" : "#ffebee",
              borderRadius: "10px", padding: "15px", marginBottom: "10px",
              border: `1px solid ${role.active ? "#e0e0e0" : "#ef9a9a"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontWeight: "bold", fontSize: "16px" }}>
                  {role.name}
                  {!role.active && <span style={{ color: "#c62828", fontSize: "12px", marginLeft: "10px" }}>DÉSACTIVÉ</span>}
                </span>
                <button onClick={() => handleToggleRole(role.id)}
                  style={{ ...btnSmall, backgroundColor: role.active ? "#ffcdd2" : "#c8e6c9", color: role.active ? "#c62828" : "#2e7d32" }}>
                  {role.active ? "Désactiver" : "Activer"}
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {allPermissions.map(perm => (
                  <label key={perm} style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    backgroundColor: role.permissions.includes(perm) ? "#e3f2fd" : "#f5f5f5",
                    padding: "5px 10px", borderRadius: "20px", fontSize: "12px", cursor: "pointer",
                    border: `1px solid ${role.permissions.includes(perm) ? "#90caf9" : "#e0e0e0"}`,
                  }}>
                    <input type="checkbox" checked={role.permissions.includes(perm)}
                      onChange={() => handleTogglePermission(role.id, perm)} />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <h3 style={{ ...subTitle, marginTop: "30px" }}> Utilisateurs</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Utilisateur</th>
                <th style={thStyle}>Rôle</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={tdStyle}><strong>{user.username}</strong></td>
                  <td style={tdStyle}>
                    <span style={{ backgroundColor: "#e3f2fd", color: "#1976d2", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: user.active ? "#e8f5e9" : "#ffebee",
                      color: user.active ? "#2e7d32" : "#c62828",
                      padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold",
                    }}>
                      {user.active ? " Actif" : " Inactif"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => handleToggleUser(user.id)}
                        style={{ ...btnSmall, backgroundColor: user.active ? "#ffcdd2" : "#c8e6c9", color: user.active ? "#c62828" : "#2e7d32" }}>
                        {user.active ? "Désactiver" : "Activer"}
                      </button>
                      <button onClick={() => handleResetPassword(user.id, user.username)}
                        style={{ ...btnSmall, backgroundColor: "#fff3e0", color: "#e65100" }}>
                         Reset MDP
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== RFID / CARTES ========== */}
      {activeSection === "rfid" && (
        <div style={sectionCard}>
          <h2 style={sectionTitle}> Paramètres RFID / Cartes</h2>
          <p style={sectionDesc}>Configuration des cartes RFID et de leur gestion</p>

          <div style={fieldGroup}>
            <label style={labelStyle}>Longueur UID attendue (caractères)</label>
            <input type="number" value={uidLength} onChange={(e) => setUidLength(Number(e.target.value))}
              min={4} max={20} style={inputStyle} />
            <span style={helpText}>Nombre de caractères hexadécimaux (ex: 8 pour "A1B2C3D4")</span>
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Nombre max de cartes par étudiant</label>
            <input type="number" value={maxCardsPerStudent} onChange={(e) => setMaxCardsPerStudent(Number(e.target.value))}
              min={1} max={5} style={inputStyle} />
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Durée de validité des cartes (jours)</label>
            <input type="number" value={cardValidityDays} onChange={(e) => setCardValidityDays(Number(e.target.value))}
              min={30} max={1825} style={inputStyle} />
          </div>

          <div style={fieldGroup}>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "10px" }}>
              <input type="checkbox" checked={cardAutoDisable}
                onChange={(e) => setCardAutoDisable(e.target.checked)}
                style={{ width: "18px", height: "18px" }} />
              Désactiver automatiquement les cartes expirées
            </label>
          </div>

          <div style={{ backgroundColor: "#e3f2fd", borderRadius: "10px", padding: "15px", marginTop: "10px" }}>
            <strong> Résumé :</strong>
            <ul style={{ margin: "10px 0 0", paddingLeft: "20px", lineHeight: "1.8" }}>
              <li>UID : <strong>{uidLength} caractères</strong></li>
              <li>Max cartes/étudiant : <strong>{maxCardsPerStudent}</strong></li>
              <li>Validité : <strong>{cardValidityDays} jours</strong> ({Math.round(cardValidityDays / 30)} mois)</li>
              <li>Auto-désactivation : <strong>{cardAutoDisable ? "Oui " : "Non "}</strong></li>
            </ul>
          </div>

          <button onClick={handleSaveRFID} style={btnSave}> Sauvegarder</button>
        </div>
      )}

      {/* ========== RÈGLES D'ACCÈS ========== */}
      {activeSection === "access" && (
        <div style={sectionCard}>
          <h2 style={sectionTitle}> Règles d'Accès</h2>
          <p style={sectionDesc}>Définir les horaires, retards et conditions d'accès</p>

          <h3 style={subTitle}> Horaires d'Accès Autorisés</h3>
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Heure de début</label>
              <input type="time" value={accessStart} onChange={(e) => setAccessStart(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Heure de fin</label>
              <input type="time" value={accessEnd} onChange={(e) => setAccessEnd(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ backgroundColor: "#e8f5e9", borderRadius: "10px", padding: "15px", marginBottom: "20px", textAlign: "center" }}>
             Accès autorisé de <strong>{accessStart}</strong> à <strong>{accessEnd}</strong>
          </div>

          <h3 style={subTitle}> Seuil de Retard</h3>
          <div style={fieldGroup}>
            <label style={labelStyle}>Tolérance de retard (minutes)</label>
            <input type="number" value={lateThresholdMinutes}
              onChange={(e) => setLateThresholdMinutes(Number(e.target.value))}
              min={0} max={60} style={inputStyle} />
            <span style={helpText}>Au-delà de {lateThresholdMinutes} min, le pointage sera "en retard"</span>
          </div>

          <h3 style={subTitle}> Blocage Frais Académiques</h3>
          <div style={fieldGroup}>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "10px" }}>
              <input type="checkbox" checked={blockUnpaidFees}
                onChange={(e) => setBlockUnpaidFees(e.target.checked)}
                style={{ width: "18px", height: "18px" }} />
              Bloquer l'accès aux étudiants avec frais impayés
            </label>
            <span style={helpText}>
              {blockUnpaidFees ? " Les étudiants non en ordre seront refusés" : " Tous les étudiants auront accès"}
            </span>
          </div>

          <button onClick={handleSaveAccess} style={btnSave}> Sauvegarder</button>
        </div>
      )}

      {/* ========== NOTIFICATIONS ========== */}
      {activeSection === "notifications" && (
        <div style={sectionCard}>
          <h2 style={sectionTitle}> Notifications & Alertes</h2>
          <p style={sectionDesc}>Configurer les alertes automatiques du système</p>

          <div style={fieldGroup}>
            <label style={labelStyle}>Email de l'Administration</label>
            <input type="email" value={emailAdmin} onChange={(e) => setEmailAdmin(e.target.value)}
              style={inputStyle} placeholder="yannbanga17@gmail.com" />
          </div>

          <h3 style={subTitle}> Types d'Alertes</h3>

          {[
            { label: " Accès refusé", desc: "Notifier quand un accès est refusé", value: notifyAccessDenied, setter: setNotifyAccessDenied },
            { label: " Carte expirée", desc: "Alerter quand une carte expirée est utilisée", value: notifyExpiredCard, setter: setNotifyExpiredCard },
            { label: " Carte désactivée", desc: "Alerter quand une carte désactivée est badgée", value: notifyDisabledCard, setter: setNotifyDisabledCard },
            { label: " Frais impayés", desc: "Notifier quand un étudiant avec frais impayés tente d'accéder", value: notifyUnpaidFees, setter: setNotifyUnpaidFees },
          ].map((item, idx) => (
            <div key={idx} style={toggleCard}>
              <div>
                <strong>{item.label}</strong>
                <p style={{ margin: "5px 0 0", color: "#777", fontSize: "13px" }}>{item.desc}</p>
              </div>
              <label style={switchLabel}>
                <input type="checkbox" checked={item.value}
                  onChange={(e) => item.setter(e.target.checked)} style={{ display: "none" }} />
                <span style={switchTrack(item.value)}>
                  <span style={switchThumb(item.value)} />
                </span>
              </label>
            </div>
          ))}

          <button onClick={handleSaveNotifications} style={btnSave}> Sauvegarder</button>
        </div>
      )}
    </div>
  );
}

// ========== STYLES ==========
const sectionCard = { backgroundColor: "white", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", padding: "30px" };
const sectionTitle = { color: "#1976d2", marginTop: 0, marginBottom: "5px" };
const sectionDesc = { color: "#999", marginTop: 0, marginBottom: "25px", fontSize: "14px" };
const subTitle = { color: "#333", fontSize: "16px", marginBottom: "15px", paddingBottom: "8px", borderBottom: "2px solid #e3f2fd" };
const fieldGroup = { marginBottom: "20px" };
const labelStyle = { display: "block", marginBottom: "8px", fontWeight: "bold", color: "#555", fontSize: "14px" };
const inputStyle = { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" };
const helpText = { display: "block", marginTop: "5px", fontSize: "12px", color: "#999" };
const btnPrimary = { backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "8px", padding: "12px 20px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" };
const btnSave = { backgroundColor: "#2e7d32", color: "white", border: "none", borderRadius: "8px", padding: "14px 30px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginTop: "25px", width: "100%" };
const btnSmall = { border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" };
const tableStyle = { width: "100%", borderCollapse: "collapse", marginTop: "10px" };
const thStyle = { textAlign: "left", padding: "12px", backgroundColor: "#f5f5f5", borderBottom: "2px solid #e0e0e0", color: "#555", fontSize: "13px", fontWeight: "bold" };
const tdStyle = { padding: "12px", borderBottom: "1px solid #f0f0f0", verticalAlign: "middle" };
const toggleCard = { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9f9f9", borderRadius: "10px", padding: "15px 20px", marginBottom: "10px", border: "1px solid #e0e0e0" };
const switchLabel = { cursor: "pointer", flexShrink: 0 };
const switchTrack = (active) => ({ display: "block", width: "50px", height: "26px", borderRadius: "13px", backgroundColor: active ? "#4caf50" : "#ccc", position: "relative", transition: "background-color 0.3s" });
const switchThumb = (active) => ({ display: "block", width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "white", position: "absolute", top: "2px", left: active ? "26px" : "2px", transition: "left 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" });

export default Settings;