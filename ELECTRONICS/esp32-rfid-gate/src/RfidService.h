#pragma once

#include <Arduino.h>
#include <MFRC522.h>
#include <SPI.h>

class RfidService {
 public:
  RfidService(uint8_t ssPin, uint8_t rstPin);

  void begin();
  bool readUid(String& uidHex);

 private:
  MFRC522 reader_;

  static String toUidHex(const MFRC522::Uid& uid);
};
