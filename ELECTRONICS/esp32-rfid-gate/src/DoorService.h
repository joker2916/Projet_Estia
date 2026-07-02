#pragma once

#include <Arduino.h>
#include <ESP32Servo.h>

class DoorService {
 public:
  DoorService(int servoPin, int closedAngle, int openAngle);

  void begin();
  void loop();

  void openFor(uint32_t durationMs);
  void close();
  bool isOpen() const;

 private:
  Servo servo_;
  int servoPin_;
  int closedAngle_;
  int openAngle_;
  bool opened_;
  uint32_t closeAtMs_;
};
