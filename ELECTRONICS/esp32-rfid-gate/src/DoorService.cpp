#include "DoorService.h"

#include "Logger.h"

DoorService::DoorService(int servoPin, int closedAngle, int openAngle)
    : servoPin_(servoPin),
      closedAngle_(closedAngle),
      openAngle_(openAngle),
      opened_(false),
      closeAtMs_(0) {}

void DoorService::begin() {
  servo_.setPeriodHertz(50);
  servo_.attach(servoPin_, 500, 2400);
  close();
  Logger::info("Door servo initialized");
}

void DoorService::loop() {
  if (!opened_) {
    return;
  }
  if ((int32_t)(millis() - closeAtMs_) >= 0) {
    close();
  }
}

void DoorService::openFor(uint32_t durationMs) {
  servo_.write(openAngle_);
  opened_ = true;
  closeAtMs_ = millis() + durationMs;
  Logger::info(String("Door opened for ") + durationMs + " ms");
}

void DoorService::close() {
  servo_.write(closedAngle_);
  opened_ = false;
  closeAtMs_ = 0;
  Logger::info("Door closed");
}

bool DoorService::isOpen() const {
  return opened_;
}
