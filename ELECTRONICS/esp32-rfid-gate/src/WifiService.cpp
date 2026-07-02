#include "WifiService.h"

#include "Logger.h"

WifiService::WifiService(const char* ssid, const char* password, uint32_t reconnectIntervalMs)
    : ssid_(ssid),
      password_(password),
      reconnectIntervalMs_(reconnectIntervalMs),
      lastReconnectAttemptMs_(0) {}

void WifiService::begin() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  connectNow();
}

void WifiService::loop() {
  if (isConnected()) {
    return;
  }

  const uint32_t now = millis();
  if (now - lastReconnectAttemptMs_ >= reconnectIntervalMs_) {
    Logger::warn("Wi-Fi disconnected, attempting reconnect...");
    connectNow();
  }
}

bool WifiService::isConnected() const {
  return WiFi.status() == WL_CONNECTED;
}

String WifiService::ipAddress() const {
  return isConnected() ? WiFi.localIP().toString() : String("0.0.0.0");
}

void WifiService::connectNow() {
  lastReconnectAttemptMs_ = millis();
  Logger::info(String("Connecting Wi-Fi SSID: ") + ssid_);
  WiFi.begin(ssid_, password_);

  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 12000) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Logger::info(String("Wi-Fi connected, IP: ") + WiFi.localIP().toString());
  } else {
    Logger::warn("Wi-Fi connection timeout");
  }
}
