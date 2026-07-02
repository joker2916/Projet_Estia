#pragma once

#include <Arduino.h>

#include "ApiClient.h"
#include "DoorService.h"

class AccessController {
 public:
  AccessController(ApiClient& apiClient, DoorService& door, uint32_t defaultOpenMs, uint32_t cardCooldownMs);

  void handleUid(const String& uid);

 private:
  ApiClient& apiClient_;
  DoorService& door_;
  uint32_t defaultOpenMs_;
  uint32_t cardCooldownMs_;

  String lastUid_;
  uint32_t lastUidAtMs_;

  bool isDuplicateWithinCooldown(const String& uid, uint32_t now) const;
  static String prettyDecision(const ApiDecision& decision);
};
