import api from "./axios";

export function loginStudent(matricule, password) {
  return api.post("student/login/", { matricule, password });
}

export function getStudentPortal(token, params) {
  return api.get("student/portal/", {
    params,
    headers: { Authorization: `Student ${token}` },
  });
}

export function loginProfessor(username, password) {
  return api.post("professor/login/", { username, password });
}

export function getProfessorPortal(token, params) {
  return api.get("professor/portal/", {
    params,
    headers: { Authorization: `Token ${token}` },
  });
}

export function updateProfessorCpt(token, payload) {
  return api.post("professor/cpt/", payload, {
    headers: { Authorization: `Token ${token}` },
  });
}
