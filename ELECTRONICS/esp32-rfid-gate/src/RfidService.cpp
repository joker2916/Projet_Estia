#include "RfidService.h"

#include "Logger.h"

RfidService::RfidService(uint8_t ssPin, uint8_t rstPin) : reader_(ssPin, rstPin) {}

void RfidService::begin() {
  reader_.PCD_Init();
  delay(50);

  const byte version = reader_.PCD_ReadRegister(MFRC522::VersionReg);
  String versionHex = "0x";
  if (version < 0x10) {
    versionHex += "0";
  }
  versionHex += String(version, HEX);
  versionHex.toUpperCase();

  Logger::info("RC522 initialized");
  Logger::info("RC522 VersionReg=" + versionHex);
  if (version == 0x00 || version == 0xFF) {
    Logger::error("RC522 not detected on SPI (check SDA/SCK/MOSI/MISO/RST/3.3V/GND)");
  }
}

bool RfidService::readUid(String& uidHex) {
  if (!reader_.PICC_IsNewCardPresent()) {
    return false;
  }
  if (!reader_.PICC_ReadCardSerial()) {
    return false;
  }

  uidHex = toUidHex(reader_.uid);
  reader_.PICC_HaltA();
  reader_.PCD_StopCrypto1();
  return true;
}

String RfidService::toUidHex(const MFRC522::Uid& uid) {
  String out;
  out.reserve(uid.size * 2);

  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) {
      out += '0';
    }
    out += String(uid.uidByte[i], HEX);
  }

  out.toUpperCase();
  return out;
}
