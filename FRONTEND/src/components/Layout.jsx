import { NavLink, Outlet, useNavigate } from "react-router-dom";

function Layout() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div style={{
        width: "250px",
        backgroundColor: "#1a237e",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            padding: "25px",
            textAlign: "center",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}>
            <h2 style={{ margin: 0 }}> Pointage</h2>
            <p style={{ margin: "5px 0 0", fontSize: "13px", opacity: 0.7 }}>
              RFID System
            </p>
          </div>

          <nav style={{ marginTop: "20px" }}>
            <SideLink to="/" label="Dashboard" />
            <SideLink to="/students" label="Étudiants" />
            <SideLink to="/cards" label="Cartes RFID" />
            <SideLink to="/attendance" label="Présences" />
            <SideLink to="/settings"label="Paramètres" />

          </nav>
        </div>

        {/* User + Logout */}
        <div style={{
          padding: "20px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center",
        }}>
          <p style={{ margin: "0 0 10px", fontSize: "14px" }}>
            👤 {username || "Admin"}
          </p>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#c62828",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
             Déconnexion
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        backgroundColor: "#f5f5f5",
        padding: "30px",
        overflowY: "auto",
      }}>
        <Outlet />
      </div>
    </div>
  );
}

function SideLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 25px",
        color: "white",
        textDecoration: "none",
        backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
        borderLeft: isActive ? "4px solid #42a5f5" : "4px solid transparent",
        fontSize: "15px",
      })}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default Layout;
