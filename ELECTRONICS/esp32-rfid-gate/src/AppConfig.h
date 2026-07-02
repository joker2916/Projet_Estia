#pragma once

// Copy this file from include/AppConfig.h.example and adapt values.
// Keeping this file in src allows quick local compilation.
namespace AppConfig {

static const char* WIFI_SSID = "BM17 7923";
static const char* WIFI_PASSWORD = "19K5f30<";

static const char* SERVER_BASE_URL = "http://172.20.0.1:8000";
static const char* API_TOKEN = "c155a72f62eea0fdf2698185a4539f17ba6ff6d8";
static const char* DEVICE_SOURCE = "esp32_gate_main";

constexpr uint32_t HTTP_TIMEOUT_MS = 4000;
constexpr uint32_t WIFI_RECONNECT_INTERVAL_MS = 7000;
constexpr uint32_t LOOP_IDLE_DELAY_MS = 25;

constexpr uint32_t DOOR_OPEN_MS = 3000;
constexpr uint32_t CARD_COOLDOWN_MS = 1800;

constexpr int SERVO_CLOSED_ANGLE = 5;
constexpr int SERVO_OPEN_ANGLE = 92;

}
