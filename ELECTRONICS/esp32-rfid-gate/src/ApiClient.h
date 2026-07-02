#pragma once

#include <Arduino.h>

struct ApiDecision {
  bool ok;
  bool allowed;
  String result;
  String reason;
  String message;
  String doorAction;
  uint32_t openDurationMs;
  int eventId;
  String cardUuid;
};

class ApiClient {
 public:
  ApiClient(const String& baseUrl, const String& token, const String& deviceSource, uint32_t timeoutMs);

  ApiDecision checkAccess(const String& uid, uint32_t requestedOpenDurationMs) const;

 private:
  String baseUrl_;
  String token_;
  String deviceSource_;
  uint32_t timeoutMs_;
};
