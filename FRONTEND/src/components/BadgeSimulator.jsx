import { useState } from "react";
import GateSimulationAnimation from "./GateSimulationAnimation";
import { simulateStudentBadge } from "../api/portals";

const SCAN_ANIMATION_MS = 1400;
const RESULT_DISPLAY_MS = 3200;

function BadgeSimulator({ token, cardUid, studentName, onScanComplete }) {
  const [simulating, setSimulating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState("idle");
  const [result, setResult] = useState(null);

  const handleSimulate = async (event) => {
    event.preventDefault();
    if (!cardUid) {
      setResult({
        allowed: false,
        message: "Aucune carte RFID active n'est associee a votre inscription.",
      });
      setAnimationPhase("denied");
      return;
    }

    setSimulating(true);
    setResult(null);
    setAnimationPhase("scanning");
    const scanStartedAt = Date.now();

    try {
      const apiPromise = simulateStudentBadge(token);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      setAnimationPhase("processing");

      const res = await apiPromise;
      const elapsed = Date.now() - scanStartedAt;
      if (elapsed < SCAN_ANIMATION_MS) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, SCAN_ANIMATION_MS - elapsed),
        );
      }

      setResult(res.data);
      setAnimationPhase(res.data.allowed ? "allowed" : "denied");
      if (onScanComplete) {
        await onScanComplete(res.data);
      }

      window.setTimeout(() => {
        setAnimationPhase("idle");
      }, RESULT_DISPLAY_MS);
    } catch {
      setResult({
        allowed: false,
        message: "Simulation impossible. Verifiez votre connexion.",
      });
      setAnimationPhase("denied");
      window.setTimeout(() => setAnimationPhase("idle"), RESULT_DISPLAY_MS);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <section style={sectionStyle}>
      <h3 style={titleStyle}>Simulation de badge</h3>
      <p style={hintStyle}>
        Testez le passage au portique avec votre carte. Le resultat s&apos;affiche
        ici uniquement ; le journal detaille reste reserve a l&apos;administration.
      </p>

      <GateSimulationAnimation
        phase={animationPhase}
        uid={cardUid || "----"}
        studentName={studentName}
      />

      <form onSubmit={handleSimulate} style={formStyle}>
        <button type="submit" disabled={simulating || !cardUid} style={buttonStyle}>
          {simulating ? "Simulation..." : "Simuler mon passage"}
        </button>
      </form>

      {result && (
        <div
          style={{
            ...resultBox,
            backgroundColor: result.allowed ? "#e8f5e9" : "#ffebee",
            color: result.allowed ? "#1b5e20" : "#b71c1c",
          }}
        >
          <strong>{result.allowed ? "Acces autorise" : "Acces refuse"}</strong>
          <div>{result.message || "-"}</div>
          {result.reason && result.reason !== "none" && (
            <div>Motif : {result.reason}</div>
          )}
        </div>
      )}
    </section>
  );
}

const sectionStyle = {
  marginTop: "24px",
  padding: "18px",
  borderRadius: "12px",
  backgroundColor: "#f5f9ff",
  border: "1px solid #dbe7f5",
};
const titleStyle = { margin: "0 0 8px", color: "#1a237e" };
const hintStyle = { margin: "0 0 16px", color: "#666", lineHeight: 1.5 };
const formStyle = { display: "flex", justifyContent: "center" };
const buttonStyle = {
  padding: "12px 20px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: "#1976d2",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};
const resultBox = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "8px",
  lineHeight: 1.5,
};

export default BadgeSimulator;
