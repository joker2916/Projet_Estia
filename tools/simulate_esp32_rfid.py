#!/usr/bin/env python3
"""
Simulateur local d'un lecteur ESP32 RFID.

Le script imite un ESP32 qui lit plusieurs UID de cartes et appelle l'API
`POST /api/rfid/scan/`. Il n'utilise que la bibliotheque standard Python.
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_API_URL = "http://127.0.0.1:8000/api/"
DEFAULT_SOURCE = "esp32-virtual-01"
DEFAULT_SCENARIOS = [
    ("allowed-card", "04A1B2C3", False, ""),
    ("unpaid-fees-card", "04D4E5F6", False, ""),
    ("unknown-card", "UNKNOWN001", False, ""),
    ("idempotent-retry", "04A1B2C3", True, "retry"),
]


def post_json(url, payload, token=None):
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Token {token}"

    request = Request(url, data=data, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=10) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            payload = {"error": body}
        return exc.code, payload
    except URLError as exc:
        raise RuntimeError(
            f"API indisponible ({url}). Lancez le backend Django avant la simulation."
        ) from exc


def login(api_url, username, password):
    status, payload = post_json(
        f"{api_url}login/",
        {
            "username": username,
            "password": password,
        },
    )
    if status != 200 or "token" not in payload:
        raise RuntimeError(f"Connexion impossible: HTTP {status} {payload}")
    return payload["token"]


def scan(api_url, token, source, scenario_name, uid, request_id):
    status, payload = post_json(
        f"{api_url}rfid/scan/",
        {
            "uid": uid,
            "source": source,
            "request_id": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        token=token,
    )
    result = payload.get("result", "unknown")
    reason = payload.get("reason", "unknown")
    message = payload.get("message", "")
    duplicate = payload.get("duplicate", False)
    student = payload.get("event", {}).get("student_name") or "-"
    event_id = payload.get("event", {}).get("id", "-")
    state = "AUTORISE" if payload.get("allowed") else "REFUSE"

    print(
        f"[{scenario_name}] uid={uid} status={status} decision={state} "
        f"reason={reason} duplicate={duplicate} event={event_id} student={student} "
        f"message={message}"
    )
    return payload


def run(args):
    api_url = args.api_url.rstrip("/") + "/"
    token = args.token or login(api_url, args.username, args.password)
    source = args.source

    print(f"ESP32 virtuel: source={source} api={api_url}")
    print("Demarrage des scans simules...")

    run_id = int(time.time())
    for index, (scenario_name, uid, retry, source_suffix) in enumerate(DEFAULT_SCENARIOS, start=1):
        scenario_source = f"{source}-{source_suffix}" if source_suffix else source
        request_id = f"{scenario_source}-{run_id}-{index}"
        scan(api_url, token, scenario_source, scenario_name, uid, request_id)
        if retry:
            scan(api_url, token, scenario_source, f"{scenario_name}-same-request", uid, request_id)
        time.sleep(args.delay)


def parse_args(argv):
    parser = argparse.ArgumentParser(description="Simule un lecteur ESP32 RFID.")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="URL de base de l'API.")
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="Identifiant du lecteur virtuel.")
    parser.add_argument("--token", default="", help="Token DRF existant, sinon login automatique.")
    parser.add_argument("--username", default="admin", help="Utilisateur de test.")
    parser.add_argument("--password", default="admin123", help="Mot de passe de test.")
    parser.add_argument("--delay", type=float, default=0.2, help="Delai entre les scans.")
    return parser.parse_args(argv)


if __name__ == "__main__":
    try:
        run(parse_args(sys.argv[1:]))
    except RuntimeError as exc:
        print(f"Erreur: {exc}", file=sys.stderr)
        raise SystemExit(1)
