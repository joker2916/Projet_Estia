#pragma once

// ESP32 DevKit V1 wiring suggestion
// RC522 SPI:
// SDA(SS) -> GPIO5
// SCK    -> GPIO18
// MOSI   -> GPIO23
// MISO   -> GPIO19
// RST    -> GPIO22

namespace Pins {
constexpr int RFID_SCK = 18;
constexpr int RFID_MISO = 19;
constexpr int RFID_MOSI = 23;
constexpr int RFID_SS = 5;
constexpr int RFID_RST = 22;
constexpr int SERVO = 13;
}
