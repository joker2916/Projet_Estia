function GateSimulationAnimation({ phase = "idle", uid = "", studentName = "" }) {
  const isScanning = phase === "scanning" || phase === "processing";
  const isAllowed = phase === "allowed";
  const isDenied = phase === "denied";
  const ledColor = isAllowed
    ? "#4caf50"
    : isDenied
      ? "#f44336"
      : isScanning
        ? "#2196f3"
        : "#9e9e9e";

  const statusLabel =
    phase === "scanning"
      ? "Lecture de la carte..."
      : phase === "processing"
        ? "Verification en cours..."
        : isAllowed
          ? "Acces autorise"
          : isDenied
            ? "Acces refuse"
            : "En attente de passage";

  return (
    <div style={wrapperStyle}>
      <style>{keyframes}</style>

      <div
        className={`gate-scene ${isScanning ? "gate-scene--scanning" : ""} ${
          isAllowed ? "gate-scene--allowed" : ""
        } ${isDenied ? "gate-scene--denied" : ""}`}
      >
        <div style={facultyLabelStyle}>Portique faculte</div>

        <div style={gateFrameStyle}>
          <div className={`gate-arm gate-arm--left ${isAllowed ? "gate-arm--open" : ""}`} />
          <div className={`gate-arm gate-arm--right ${isAllowed ? "gate-arm--open" : ""}`} />

          <div style={readerStyle}>
            <div
              className={`gate-led ${isScanning ? "gate-led--pulse" : ""}`}
              style={{ backgroundColor: ledColor, boxShadow: `0 0 12px ${ledColor}` }}
            />
            <div style={readerLabelStyle}>RFID</div>
            {isScanning && (
              <>
                <div className="gate-scan-wave gate-scan-wave--1" />
                <div className="gate-scan-wave gate-scan-wave--2" />
              </>
            )}
          </div>

          <div
            className={`gate-card ${
              isScanning || isAllowed || isDenied ? "gate-card--present" : ""
            } ${isAllowed ? "gate-card--pass" : ""}`}
          >
            <span style={cardChipStyle} />
            <span style={cardUidStyle}>{uid || "----"}</span>
          </div>

          {isAllowed && <div className="gate-check">✓</div>}
          {isDenied && <div className="gate-cross">✕</div>}
        </div>

        <div style={statusRowStyle}>
          <span
            style={{
              ...statusBadgeStyle,
              backgroundColor: isAllowed
                ? "#e8f5e9"
                : isDenied
                  ? "#ffebee"
                  : isScanning
                    ? "#e3f2fd"
                    : "#f5f5f5",
              color: isAllowed
                ? "#1b5e20"
                : isDenied
                  ? "#b71c1c"
                  : isScanning
                    ? "#1565c0"
                    : "#616161",
            }}
          >
            {statusLabel}
          </span>
          {studentName && (
            <span style={studentTagStyle}>{studentName}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const keyframes = `
  @keyframes gateLedPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.15); opacity: 0.75; }
  }
  @keyframes gateScanWave {
    0% { transform: scale(0.6); opacity: 0.8; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes gateCardSlide {
    0% { transform: translateX(-70px); opacity: 0.3; }
    100% { transform: translateX(0); opacity: 1; }
  }
  @keyframes gateCardPass {
    0% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(90px); opacity: 0; }
  }
  @keyframes gateArmOpenLeft {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(-58deg); }
  }
  @keyframes gateArmOpenRight {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(58deg); }
  }
  @keyframes gateDeniedShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  @keyframes gatePopIn {
    0% { transform: scale(0); opacity: 0; }
    70% { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .gate-scene--scanning .gate-card--present {
    animation: gateCardSlide 0.7s ease-out forwards;
  }
  .gate-scene--allowed .gate-card--pass {
    animation: gateCardPass 0.9s ease-in forwards;
  }
  .gate-arm--open.gate-arm--left {
    animation: gateArmOpenLeft 0.5s ease-out forwards;
  }
  .gate-arm--open.gate-arm--right {
    animation: gateArmOpenRight 0.5s ease-out forwards;
  }
  .gate-scene--denied {
    animation: gateDeniedShake 0.45s ease-in-out;
  }
  .gate-led--pulse {
    animation: gateLedPulse 0.9s ease-in-out infinite;
  }
  .gate-scan-wave {
    position: absolute;
    inset: 8px;
    border: 2px solid #2196f3;
    border-radius: 10px;
    pointer-events: none;
  }
  .gate-scan-wave--1 {
    animation: gateScanWave 1.2s ease-out infinite;
  }
  .gate-scan-wave--2 {
    animation: gateScanWave 1.2s ease-out 0.4s infinite;
  }
  .gate-check, .gate-cross {
    position: absolute;
    top: 12px;
    right: 16px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
    animation: gatePopIn 0.35s ease-out forwards;
  }
  .gate-check {
    background: #4caf50;
    color: white;
  }
  .gate-cross {
    background: #f44336;
    color: white;
  }
  .gate-arm {
    position: absolute;
    top: 28px;
    width: 8px;
    height: 88px;
    background: linear-gradient(180deg, #546e7a, #37474f);
    border-radius: 4px;
    transform-origin: top center;
    z-index: 2;
  }
  .gate-arm--left { left: 38%; }
  .gate-arm--right { right: 38%; }
  .gate-card {
    position: absolute;
    left: 18px;
    bottom: 22px;
    width: 72px;
    height: 46px;
    border-radius: 8px;
    background: linear-gradient(135deg, #1976d2, #0d47a1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 6px 8px;
    opacity: 0.25;
    z-index: 3;
  }
  .gate-card--present { opacity: 1; }
`;

const wrapperStyle = {
  marginBottom: "20px",
  padding: "20px",
  borderRadius: "14px",
  background: "linear-gradient(180deg, #eef4fb 0%, #f8fbff 100%)",
  border: "1px solid #dbe7f5",
};

const facultyLabelStyle = {
  textAlign: "center",
  fontSize: "13px",
  fontWeight: 600,
  color: "#546e7a",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: "12px",
};

const gateFrameStyle = {
  position: "relative",
  height: "180px",
  maxWidth: "360px",
  margin: "0 auto",
  borderRadius: "16px",
  background: "linear-gradient(180deg, #eceff1 0%, #cfd8dc 100%)",
  border: "2px solid #b0bec5",
  overflow: "hidden",
};

const readerStyle = {
  position: "absolute",
  top: "18px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "84px",
  height: "54px",
  borderRadius: "12px",
  background: "#263238",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 4,
};

const readerLabelStyle = {
  fontSize: "10px",
  color: "#90a4ae",
  marginTop: "4px",
  letterSpacing: "0.08em",
};

const cardChipStyle = {
  width: "18px",
  height: "12px",
  borderRadius: "2px",
  background: "#ffd54f",
  marginBottom: "4px",
};

const cardUidStyle = {
  fontSize: "9px",
  color: "rgba(255,255,255,0.9)",
  fontFamily: "monospace",
};

const statusRowStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const statusBadgeStyle = {
  padding: "8px 14px",
  borderRadius: "999px",
  fontSize: "14px",
  fontWeight: 600,
};

const studentTagStyle = {
  padding: "6px 12px",
  borderRadius: "999px",
  backgroundColor: "#fff",
  border: "1px solid #dbe7f5",
  fontSize: "13px",
  color: "#455a64",
};

export default GateSimulationAnimation;
