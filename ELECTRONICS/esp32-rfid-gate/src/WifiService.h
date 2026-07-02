#pragma once

#include <Arduino.h>
#include <WiFi.h>

class WifiService {
 public:
  WifiService(const char* ssid, const char* password, uint32_t reconnectIntervalMs);

  void begin();
  void loop();
  bool isConnected() const;
  String ipAddress() const;

 private:
  const char* ssid_;
  const char* password_;
  uint32_t reconnectIntervalMs_;
  uint32_t lastReconnectAttemptMs_;

  void connectNow();
};
