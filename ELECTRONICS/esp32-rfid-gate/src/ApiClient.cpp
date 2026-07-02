#include "ApiClient.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

ApiClient::ApiClient(const String& baseUrl, const String& token, const String& deviceSource,
                     uint32_t timeoutMs)
    : baseUrl_(baseUrl), token_(token), deviceSource_(deviceSource), timeoutMs_(timeoutMs) {}

ApiDecision ApiClient::checkAccess(const String& uid, uint32_t requestedOpenDurationMs) const {
  ApiDecision decision{};
  decision.ok = false;
  decision.allowed = false;
  decision.result = "denied";
  decision.reason = "network_error";
  decision.message = "Request failed";
  decision.doorAction = "keep_closed";
  decision.openDurationMs = requestedOpenDurationMs;
  decision.eventId = -1;

  if (WiFi.status() != WL_CONNECTED) {
    decision.message = "Wi-Fi disconnected";
    return decision;
  }

  HTTPClient http;
  const String url = baseUrl_ + "/api/device/access-check/";

  if (!http.begin(url)) {
    decision.message = "HTTP begin failed";
    return decision;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Token " + token_);
  http.setTimeout(timeoutMs_);

  StaticJsonDocument<256> payload;
  payload["uid"] = uid;
  payload["source"] = deviceSource_;
  payload["open_duration_ms"] = requestedOpenDurationMs;

  String body;
  serializeJson(payload, body);

  const int code = http.POST(body);
  if (code <= 0) {
    decision.message = "HTTP error code: " + String(code);
    http.end();
    return decision;
  }

  const String responseBody = http.getString();
  http.end();

  if (code < 200 || code >= 300) {
    decision.message = "API rejected: HTTP " + String(code) + " body=" + responseBody;
    return decision;
  }

  DynamicJsonDocument doc(1024);
  const DeserializationError err = deserializeJson(doc, responseBody);
  if (err) {
    decision.message = String("JSON parse error: ") + err.c_str();
    return decision;
  }

  decision.ok = true;
  decision.allowed = doc["allowed"] | false;
  decision.result = String((const char*)(doc["result"] | "denied"));
  decision.reason = String((const char*)(doc["reason"] | "unknown"));
  decision.message = String((const char*)(doc["message"] | "No message"));
  decision.doorAction = String((const char*)(doc["door_action"] | "keep_closed"));
  decision.openDurationMs = doc["open_duration_ms"] | requestedOpenDurationMs;
  decision.eventId = doc["event_id"] | -1;
  decision.cardUuid = String((const char*)(doc["card_uuid"] | ""));

  return decision;
}
