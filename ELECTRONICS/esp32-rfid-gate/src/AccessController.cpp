#include "AccessController.h"

#include "Logger.h"

AccessController::AccessController(ApiClient& apiClient, DoorService& door, uint32_t defaultOpenMs,
                                   uint32_t cardCooldownMs)
    : apiClient_(apiClient),
      door_(door),
      defaultOpenMs_(defaultOpenMs),
      cardCooldownMs_(cardCooldownMs),
      lastUid_(""),
      lastUidAtMs_(0) {}

void AccessController::handleUid(const String& uid) {
  const uint32_t now = millis();
  if (isDuplicateWithinCooldown(uid, now)) {
    Logger::warn("Duplicate UID scan ignored during cooldown: " + uid);
    return;
  }

  lastUid_ = uid;
  lastUidAtMs_ = now;

  Logger::sep("RFID SCAN");
  Logger::info("UID=" + uid);

  const ApiDecision decision = apiClient_.checkAccess(uid, defaultOpenMs_);

  if (!decision.ok) {
    Logger::error("API call failed: " + decision.message);
    door_.close();
    return;
  }

  Logger::info(prettyDecision(decision));

  if (decision.allowed || decision.doorAction == "open") {
    door_.openFor(decision.openDurationMs);
  } else {
    door_.close();
  }
}

bool AccessController::isDuplicateWithinCooldown(const String& uid, uint32_t now) const {
  return uid == lastUid_ && (now - lastUidAtMs_ <= cardCooldownMs_);
}

String AccessController::prettyDecision(const ApiDecision& decision) {
  String msg = "Decision=";
  msg += decision.allowed ? "ALLOWED" : "DENIED";
  msg += " reason=" + decision.reason;
  msg += " event_id=" + String(decision.eventId);
  if (decision.cardUuid.length() > 0) {
    msg += " card_uuid=" + decision.cardUuid;
  }
  msg += " message=\"" + decision.message + "\"";
  return msg;
}
