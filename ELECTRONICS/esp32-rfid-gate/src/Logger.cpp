#include "Logger.h"

namespace Logger {

static String ts() {
  const unsigned long ms = millis();
  return String("[") + String(ms) + String("ms]");
}

void begin() {
  Serial.begin(115200);
  delay(50);
  info("Serial logger started");
}

void info(const String& message) {
  Serial.println(ts() + " [INFO] " + message);
}

void warn(const String& message) {
  Serial.println(ts() + " [WARN] " + message);
}

void error(const String& message) {
  Serial.println(ts() + " [ERR ] " + message);
}

void sep(const String& title) {
  Serial.println("\n========== " + title + " ==========");
}

}  // namespace Logger
