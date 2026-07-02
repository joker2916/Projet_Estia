import api from "./axios";

export function getAccessEvents(params) {
  return api.get("access-events/", { params });
}

export function getAttendanceLookups() {
  return Promise.all([
    api.get("faculties/", { params: { status: "active" } }),
    api.get("promotions/", { params: { status: "active" } }),
    api.get("academic-years/"),
  ]);
}

export function getActiveCards() {
  return api.get("cards/", { params: { status: "active" } });
}

export function simulateRfidScan(payload) {
  return api.post("rfid/scan/", payload);
}
