import { useState } from "react";

function Settings() {
  // --- Info générale ---
  const [universityName, setUniversityName] = useState("Université ETSIA");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // --- Utilisateurs & Rôles ---
  const [roles, setRoles] = useState([
    { id: 1, name: "Administration", permissions: ["tout_accès", "gestion_utilisateurs", "paramètres"], active: true },
    { id: 2, name: "Professeur", permissions: ["voir_pointages", "voir_étudiants"], active: true },
    { id: 3, name: "Étudiant", permissions: ["voir_propre_pointage"], active: true },
  ]);
  const [newRoleName, setNewRoleName] = useState("");
  const [users, setUsers] = useState([
    { id: 1, username: "BANGA", role: "Administration", active: true },
    { id: 2, username: "Prof_Mukendi", role: "Professeur", active: true },
    { id: 3, username: "Etudiant_01", role: "Étudiant", active: false },
  ]);

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
  const [emailAdmin, setEmailAdmin] = useState("admin@etsia.cd");
  const [notifyAccessDenied, setNotifyAccessDenied] = useState(true);
  const [notifyExpiredCard, setNotifyExpiredCard] = useState(true);
  const [notifyDisabledCard, setNotifyDisabledCard] = useState(true);
  const [notifyUnpaidFees, setNotifyUnpaidFees] = useState(false);

  // --- Section active ---
  const [activeSection, setActiveSection] = useState("general");

  // --- Handlers ---
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddRole = () => {
    if (newRoleName.trim()) {
      setRoles([...roles, {
        id: Date.now(),
        name: newRoleName.trim(),
        permissions: [],
        active: true,
      }]);
      setNewRoleName("");
    }
  };

  const handleToggleUser = (userId) => {
    setUsers(users.map(u =>
      u.id === userId ? { ...u, active: !u.active } : u
    ));
  };

  const handleToggleRole = (roleId) => {
    setRoles(roles.map(r =>
      r.id === roleId ? { ...r, active: !r.active } : r
    ));
  };

  const handleResetPassword = (username) => {
    alert(` Mot de passe réinitialisé pour ${username}. Un email a été envoyé.`);
  };

  const handleSave = () => {
    alert(" Paramètres sauvegardés avec succès !");
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

  const handleTogglePermission = (roleId, permission) => {
    setRoles(roles.map(r => {
      if (r.id === roleId) {
        const has = r.permissions.includes(permission);
        return {
          ...r,
          permissions: has
            ? r.permissions.filter(p => p !== permission)
            : [...r.permissions, permission],
        };
      }
      return r;
    }));
  };

  const tabs = [
    { key: "general", label: " Info Générale" },
    { key: "users", label: " Utilisateurs & Rôles" },
    { key: "rfid", label: " RFID / Cartes" },
    { key: "access", label: " Règles d'Accès" },
    { key: "notifications", label: " Notifications" },
  ];

  return (
    <div>
      {/* Titre */}
      <h1 style={{ color: "#1976d2", marginTop: 0 }}> Paramètres</h1>

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
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}>
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
                <div style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "12px",
                  border: "2px dashed #ccc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "40px",
                  color: "#ccc",
                }}>
                  🎓
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  id="logo-upload"
                  style={{ display: "none" }}
                />
                <label htmlFor="logo-upload" style={{
                  ...btnPrimary,
                  display: "inline-block",
                  cursor: "pointer",
                  padding: "10px 20px",
                  fontSize: "14px",
                }}>
                   Choisir un logo
                </label>
                <p style={{ color: "#999", fontSize: "12px", marginTop: "5px" }}>
                  PNG, JPG — Max 2MB
                </p>
              </div>
            </div>
          </div>

          <button onClick={handleSave} style={btnSave}> Sauvegarder</button>
        </div>
      )}

      {/* ========== UTILISATEURS & RÔLES ========== */}
      {activeSection === "users" && (
        <div style={sectionCard}>
          <h2 style={sectionTitle}> Gestion des Utilisateurs & Rôles</h2>
          <p style={sectionDesc}>Gérer les rôles, permissions et accès des utilisateurs</p>

          {/* Rôles */}
          <h3 style={subTitle}> Rôles & Permissions</h3>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Nouveau rôle..."
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            />
            <button onClick={handleAddRole} style={btnPrimary}>+ Ajouter</button>
          </div>

          {roles.map(role => (
            <div key={role.id} style={{
              backgroundColor: role.active ? "#f9f9f9" : "#ffebee",
              borderRadius: "10px",
              padding: "15px",
              marginBottom: "10px",
              border: `1px solid ${role.active ? "#e0e0e0" : "#ef9a9a"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontWeight: "bold", fontSize: "16px" }}>
                  {role.name}
                  {!role.active && <span style={{ color: "#c62828", fontSize: "12px", marginLeft: "10px" }}>DÉSACTIVÉ</span>}
                </span>
                <button
                  onClick={() => handleToggleRole(role.id)}
                  style={{
                    ...btnSmall,
                    backgroundColor: role.active ? "#ffcdd2" : "#c8e6c9",
                    color: role.active ? "#c62828" : "#2e7d32",
                  }}
                >
                  {role.active ? "Désactiver" : "Activer"}
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {allPermissions.map(perm => (
                  <label key={perm} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    backgroundColor: role.permissions.includes(perm) ? "#e3f2fd" : "#f5f5f5",
                    padding: "5px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    cursor: "pointer",
                    border: `1px solid ${role.permissions.includes(perm) ? "#90caf9" : "#e0e0e0"}`,
                  }}>
                    <input
                      type="checkbox"
                      checked={role.permissions.includes(perm)}
                      onChange={() => handleTogglePermission(role.id, perm)}
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Utilisateurs */}
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
                  <td style={tdStyle}>
                    <strong>{user.username}</strong>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: "#e3f2fd",
                      color: "#1976d2",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      backgroundColor: user.active ? "#e8f5e9" : "#ffebee",
                      color: user.active ? "#2e7d32" : "#c62828",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}>
                      {user.active ? " Actif" : " Inactif"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleToggleUser(user.id)}
                        style={{
                          ...btnSmall,
                          backgroundColor: user.active ? "#ffcdd2" : "#c8e6c9",
                          color: user.active ? "#c62828" : "#2e7d32",
                        }}
                      >
                        {user.active ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.username)}
                        style={{ ...btnSmall, backgroundColor: "#fff3e0", color: "#e65100" }}
                      >
                         Reset MDP
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleSave} style={btnSave}> Sauvegarder</button>
        </div>
      )}

      {/* ========== RFID / CARTES ========== */}
      {activeSection === "rfid" && (
        <div style={sectionCard}>
          <h2 style={sectionTitle}> Paramètres RFID / Cartes</h2>
          <p style={sectionDesc}>Configuration des cartes RFID et de leur gestion</p>

          <div style={fieldGroup}>
            <label style={labelStyle}>Longueur UID attendue (caractères)</label>
            <input
              type="number"
              value={uidLength}
              onChange={(e) => setUidLength(Number(e.target.value))}
              min={4}
              max={20}
              style={inputStyle}
            />
            <span style={helpText}>Nombre de caractères hexadécimaux (ex: 8 pour "A1B2C3D4")</span>
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Nombre max de cartes par étudiant</label>
            <input
              type="number"
              value={maxCardsPerStudent}
              onChange={(e) => setMaxCardsPerStudent(Number(e.target.value))}
              min={1}
              max={5}
              style={inputStyle}
            />
            <span style={helpText}>Limite le nombre de cartes actives par étudiant</span>
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Durée de validité des cartes (jours)</label>
            <input
              type="number"
              value={cardValidityDays}
              onChange={(e) => setCardValidityDays(Number(e.target.value))}
              min={30}
              max={1825}
              style={inputStyle}
            />
            <span style={helpText}>Les cartes expireront automatiquement après cette durée</span>
          </div>

          <div style={fieldGroup}>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                checked={cardAutoDisable}
                onChange={(e) => setCardAutoDisable(e.target.checked)}
                style={{ width: "18px", height: "18px" }}
              />
              Désactiver automatiquement les cartes expirées
            </label>
          </div>

          <div style={{
            backgroundColor: "#e3f2fd",
            borderRadius: "10px",
            padding: "15px",
            marginTop: "10px",
          }}>
            <strong> Résumé :</strong>
            <ul style={{ margin: "10px 0 0", paddingLeft: "20px", lineHeight: "1.8" }}>
              <li>UID : <strong>{uidLength} caractères</strong></li>
              <li>Max cartes/étudiant : <strong>{maxCardsPerStudent}</strong></li>
              <li>Validité : <strong>{cardValidityDays} jours</strong> ({Math.round(cardValidityDays / 30)} mois)</li>
              <li>Auto-désactivation : <strong>{cardAutoDisable ? "Oui" : "Non"}</strong></li>
            </ul>
          </div>

          <button onClick={handleSave} style={btnSave}> Sauvegarder</button>
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

          <div style={{
            backgroundColor: "#e8f5e9",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "20px",
            textAlign: "center",
          }}>
             Accès autorisé de <strong>{accessStart}</strong> à <strong>{accessEnd}</strong>
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
              Au-delà de {lateThresholdMinutes} min après l'heure prévue, le pointage sera marqué "en retard"
            </span>
          </div>

          <h3 style={subTitle}> Blocage Frais Académiques</h3>
          <div style={fieldGroup}>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "10px" }}>
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
                ? " Les étudiants non en ordre de paiement seront refusés"
                : " Tous les étudiants avec une carte valide auront accès"}
            </span>
          </div>

          <button onClick={handleSave} style={btnSave}> Sauvegarder</button>
        </div>
      )}

      {/* ========== NOTIFICATIONS ========== */}
      {activeSection === "notifications" && (
        <div style={sectionCard}>
          <h2 style={sectionTitle}> Notifications & Alertes</h2>
          <p style={sectionDesc}>Configurer les alertes automatiques du système</p>

          <div style={fieldGroup}>
            <label style={labelStyle}>Email de l'Administration</label>
            <input
              type="email"
              value={emailAdmin}
              onChange={(e) => setEmailAdmin(e.target.value)}
              style={inputStyle}
              placeholder="admin@universite.cd"
            />
            <span style={helpText}>Les alertes seront envoyées à cette adresse</span>
          </div>

          <h3 style={subTitle}> Types d'Alertes</h3>

          <div style={toggleCard}>
            <div>
              <strong> Accès refusé</strong>
              <p style={{ margin: "5px 0 0", color: "#777", fontSize: "13px" }}>
                Notifier quand un accès est refusé (carte invalide, frais impayés...)
              </p>
            </div>
            <label style={switchLabel}>
              <input
                type="checkbox"
                checked={notifyAccessDenied}
                onChange={(e) => setNotifyAccessDenied(e.target.checked)}
                style={{ display: "none" }}
              />
              <span style={switchTrack(notifyAccessDenied)}>
                <span style={switchThumb(notifyAccessDenied)} />
              </span>
            </label>
          </div>

          <div style={toggleCard}>
            <div>
              <strong> Carte expirée</strong>
              <p style={{ margin: "5px 0 0", color: "#777", fontSize: "13px" }}>
                Alerter quand un étudiant tente d'utiliser une carte expirée
              </p>
            </div>
            <label style={switchLabel}>
              <input
                type="checkbox"
                checked={notifyExpiredCard}
                onChange={(e) => setNotifyExpiredCard(e.target.checked)}
                style={{ display: "none" }}
              />
              <span style={switchTrack(notifyExpiredCard)}>
                <span style={switchThumb(notifyExpiredCard)} />
              </span>
            </label>
          </div>

          <div style={toggleCard}>
            <div>
              <strong> Carte désactivée</strong>
              <p style={{ margin: "5px 0 0", color: "#777", fontSize: "13px" }}>
                Alerter quand une carte désactivée est badgée
              </p>
            </div>
            <label style={switchLabel}>
              <input
                type="checkbox"
                checked={notifyDisabledCard}
                onChange={(e) => setNotifyDisabledCard(e.target.checked)}
                style={{ display: "none" }}
              />
              <span style={switchTrack(notifyDisabledCard)}>
                <span style={switchThumb(notifyDisabledCard)} />
              </span>
            </label>
          </div>

          <div style={toggleCard}>
            <div>
              <strong> Frais impayés</strong>
              <p style={{ margin: "5px 0 0", color: "#777", fontSize: "13px" }}>
                Notifier quand un étudiant avec frais impayés tente d'accéder
              </p>
            </div>
            <label style={switchLabel}>
              <input
                type="checkbox"
                checked={notifyUnpaidFees}
                onChange={(e) => setNotifyUnpaidFees(e.target.checked)}
                style={{ display: "none" }}
              />
              <span style={switchTrack(notifyUnpaidFees)}>
                <span style={switchThumb(notifyUnpaidFees)} />
              </span>
            </label>
          </div>

          <button onClick={handleSave} style={btnSave}> Sauvegarder</button>
        </div>
      )}
    </div>
  );
}

// ========== STYLES ==========

const sectionCard = {
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  padding: "30px",
};

const sectionTitle = {
  color: "#1976d2",
  marginTop: 0,
  marginBottom: "5px",
};

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

const fieldGroup = {
  marginBottom: "20px",
};

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
  transition: "border-color 0.2s",
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

const switchLabel = {
  cursor: "pointer",
  flexShrink: 0,
};

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