#include <Arduino.h>

#include "ApiClient.h"
#include "AppConfig.h"
#include "AccessController.h"
#include "DoorService.h"
#include "Logger.h"
#include "Pins.h"
#include "RfidService.h"
#include "WifiService.h"
#include <SPI.h>

WifiService wifi(
    AppConfig::WIFI_SSID,
    AppConfig::WIFI_PASSWORD,
    AppConfig::WIFI_RECONNECT_INTERVAL_MS
);

RfidService rfid(Pins::RFID_SS, Pins::RFID_RST);
DoorService door(Pins::SERVO, AppConfig::SERVO_CLOSED_ANGLE, AppConfig::SERVO_OPEN_ANGLE);
ApiClient api(
    String(AppConfig::SERVER_BASE_URL),
    String(AppConfig::API_TOKEN),
    String(AppConfig::DEVICE_SOURCE),
    AppConfig::HTTP_TIMEOUT_MS
);

AccessController accessController(
    api,
    door,
    AppConfig::DOOR_OPEN_MS,
    AppConfig::CARD_COOLDOWN_MS
);

void setup() {
  Logger::begin();
  Logger::sep("BOOT");

  Logger::info("Initializing door actuator...");
  door.begin();

  Logger::info("Configuring SPI bus...");
  SPI.begin(Pins::RFID_SCK, Pins::RFID_MISO, Pins::RFID_MOSI, Pins::RFID_SS);

  Logger::info("Initializing RFID reader...");
  rfid.begin();

  Logger::info("Initializing Wi-Fi...");
  wifi.begin();

  Logger::info("System ready");
}

void loop() {
  wifi.loop();
  door.loop();

  String uid;
  if (rfid.readUid(uid)) {
    accessController.handleUid(uid);
  }

  delay(AppConfig::LOOP_IDLE_DELAY_MS);
}
