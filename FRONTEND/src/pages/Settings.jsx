import { useState, useEffect } from "react";
import api from "../api/axios";
import PageHeader from "../components/PageHeader";
import ContentCard from "../components/ContentCard";

function Settings() {
  // --- Info générale ---
  const [universityName, setUniversityName] = useState("");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // --- Utilisateurs & Rôles ---
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newPermission, setNewPermission] = useState({
    code: "",
    label: "",
    module: "",
  });
  const [users, setUsers] = useState([]);

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
      const [uniRes, rolesRes, permissionsRes, usersRes, accessRes, notifRes] =
        await Promise.all([
          api.get("settings/university/"),
          api.get("settings/roles/"),
          api.get("settings/permissions/"),
          api.get("settings/users/"),
          api.get("settings/access/"),
          api.get("settings/notifications/"),
        ]);

      // Info générale
      setUniversityName(uniRes.data.name || "");
      if (uniRes.data.logo) setLogoPreview(uniRes.data.logo);

      // Rôles & Utilisateurs
      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
      setUsers(usersRes.data);

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
          permission_codes: [],
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
    const role = roles.find((r) => r.id === roleId);
    try {
      const res = await api.put(`settings/roles/${roleId}/`, {
        name: role.name,
        active: !role.active,
      });
      setRoles(roles.map((r) => (r.id === roleId ? res.data : r)));
      showMessage(" Rôle mis à jour !");
    } catch (err) {
      showMessage(" Erreur mise à jour rôle");
    }
  };

  const handleTogglePermission = async (roleId, permission) => {
    const role = roles.find((r) => r.id === roleId);
    const rolePermissions =
      role.permission_codes_read || role.permissions || [];
    const has = rolePermissions.includes(permission);
    const newPermissions = has
      ? rolePermissions.filter((p) => p !== permission)
      : [...rolePermissions, permission];

    try {
      const res = await api.put(`settings/roles/${roleId}/`, {
        permission_codes: newPermissions,
      });
      setRoles(roles.map((r) => (r.id === roleId ? res.data : r)));
    } catch (err) {
      showMessage(" Erreur mise à jour permissions");
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      const res = await api.put(`settings/users/${userId}/toggle/`);
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, active: res.data.active } : u,
        ),
      );
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

  const handleAssignRole = async (userId, nextRoleId) => {
    try {
      const payload = {
        role_id: nextRoleId === "" ? null : Number(nextRoleId),
      };
      const res = await api.put(
        `settings/users/${userId}/assign-role/`,
        payload,
      );
      setUsers(users.map((u) => (u.id === userId ? res.data : u)));
      showMessage("✅ Rôle utilisateur mis à jour");
    } catch (err) {
      showMessage("❌ Erreur affectation du rôle");
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

  const refreshRolesAndPermissions = async () => {
    const [rolesRes, permissionsRes] = await Promise.all([
      api.get("settings/roles/"),
      api.get("settings/permissions/"),
    ]);
    setRoles(rolesRes.data);
    setPermissions(permissionsRes.data);
  };

  const handleBootstrapDirectionRoles = async () => {
    try {
      await api.post("settings/roles/bootstrap-direction/");
      await refreshRolesAndPermissions();
      showMessage("✅ Rôles de la Direction initialisés");
    } catch (err) {
      showMessage("❌ Erreur lors de l'initialisation des rôles Direction");
    }
  };

  const handleAddPermission = async () => {
    if (!newPermission.code.trim() || !newPermission.label.trim()) {
      showMessage("❌ Code et libellé de permission requis");
      return;
    }

    try {
      await api.post("settings/permissions/", {
        code: newPermission.code.trim(),
        label: newPermission.label.trim(),
        module: newPermission.module.trim(),
        active: true,
      });
      setNewPermission({ code: "", label: "", module: "" });
      await refreshRolesAndPermissions();
      showMessage("✅ Permission ajoutée");
    } catch (err) {
      showMessage(
        "❌ Erreur ajout permission (code possiblement déjà utilisé)",
      );
    }
  };

  const handleTogglePermissionStatus = async (permission) => {
    try {
      await api.put(`settings/permissions/${permission.id}/`, {
        active: !permission.active,
      });
      await refreshRolesAndPermissions();
      showMessage("✅ Permission mise à jour");
    } catch (err) {
      showMessage("❌ Erreur mise à jour permission");
    }
  };

  const tabs = [
    { key: "general", label: " Info Générale" },
    { key: "users", label: " Utilisateurs & Rôles" },
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
          <h2 style={sectionTitle}> Gestion des Utilisateurs & Rôles</h2>
          <p style={sectionDesc}>
            Gérer les rôles, permissions et accès des utilisateurs
          </p>

          <h3 style={subTitle}> Rôles & Permissions</h3>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Nouveau rôle..."
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            />
            <button onClick={handleAddRole} style={btnPrimary}>
              + Ajouter
            </button>
            <button
              onClick={handleBootstrapDirectionRoles}
              style={{ ...btnPrimary, backgroundColor: "#6a1b9a" }}
            >
              Initialiser Direction
            </button>
          </div>

          {roles.map((role) => (
            <div
              key={role.id}
              style={{
                backgroundColor: role.active ? "#f9f9f9" : "#ffebee",
                borderRadius: "10px",
                padding: "15px",
                marginBottom: "10px",
                border: `1px solid ${role.active ? "#e0e0e0" : "#ef9a9a"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span style={{ fontWeight: "bold", fontSize: "16px" }}>
                  {role.name}
                  {!role.active && (
                    <span
                      style={{
                        color: "#c62828",
                        fontSize: "12px",
                        marginLeft: "10px",
                      }}
                    >
                      DÉSACTIVÉ
                    </span>
                  )}
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
                {permissions.map((perm) => {
                  const rolePermissions =
                    role.permission_codes_read || role.permissions || [];
                  const isChecked = rolePermissions.includes(perm.code);
                  return (
                    <label
                      key={perm.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        backgroundColor: isChecked ? "#e3f2fd" : "#f5f5f5",
                        padding: "5px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        cursor: "pointer",
                        border: `1px solid ${isChecked ? "#90caf9" : "#e0e0e0"}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          handleTogglePermission(role.id, perm.code)
                        }
                      />
                      {perm.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <h3 style={{ ...subTitle, marginTop: "30px" }}>
            {" "}
            Catalogue des Permissions
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr 1fr auto",
              gap: "10px",
              marginBottom: "15px",
            }}
          >
            <input
              type="text"
              placeholder="Code (ex: view_reports)"
              value={newPermission.code}
              onChange={(e) =>
                setNewPermission({ ...newPermission, code: e.target.value })
              }
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Libellé"
              value={newPermission.label}
              onChange={(e) =>
                setNewPermission({ ...newPermission, label: e.target.value })
              }
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Module"
              value={newPermission.module}
              onChange={(e) =>
                setNewPermission({ ...newPermission, module: e.target.value })
              }
              style={inputStyle}
            />
            <button onClick={handleAddPermission} style={btnPrimary}>
              Ajouter
            </button>
          </div>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Libellé</th>
                <th style={thStyle}>Module</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm) => (
                <tr key={perm.id}>
                  <td style={tdStyle}>
                    <strong>{perm.code}</strong>
                  </td>
                  <td style={tdStyle}>{perm.label}</td>
                  <td style={tdStyle}>{perm.module || "-"}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        backgroundColor: perm.active ? "#e8f5e9" : "#ffebee",
                        color: perm.active ? "#2e7d32" : "#c62828",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {perm.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleTogglePermissionStatus(perm)}
                      style={{
                        ...btnSmall,
                        backgroundColor: perm.active ? "#ffcdd2" : "#c8e6c9",
                        color: perm.active ? "#c62828" : "#2e7d32",
                      }}
                    >
                      {perm.active ? "Désactiver" : "Activer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={tdStyle}>
                    <strong>{user.username}</strong>
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: "#e3f2fd",
                          color: "#1976d2",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {user.role}
                      </span>
                      <select
                        value={user.role_id ?? ""}
                        onChange={(e) =>
                          handleAssignRole(user.id, e.target.value)
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                          fontSize: "12px",
                          backgroundColor: "#fff",
                        }}
                      >
                        <option value="">Aucun rôle</option>
                        {roles
                          .filter((r) => r.active)
                          .map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        backgroundColor: user.active ? "#e8f5e9" : "#ffebee",
                        color: user.active ? "#2e7d32" : "#c62828",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
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
                        onClick={() =>
                          handleResetPassword(user.id, user.username)
                        }
                        style={{
                          ...btnSmall,
                          backgroundColor: "#fff3e0",
                          color: "#e65100",
                        }}
                      >
                        Reset MDP
                      </button>
                    </div>
                  </td>
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
