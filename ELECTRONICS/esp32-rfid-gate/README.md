# ESP32 RFID Gate (Compatible with Projet_Etsia backend)

This firmware is designed to work with your existing Django API and business rules.

## 1) Hardware

- ESP32 DevKit V1
- RC522 RFID reader
- SG90 or MG90S servo
- Breadboard + Dupont wires
- External 5V power for servo (recommended)

## 2) Wiring (default pins)

See `include/Pins.h`.

- RC522 SDA/SS -> GPIO5
- RC522 SCK -> GPIO18
- RC522 MOSI -> GPIO23
- RC522 MISO -> GPIO19
- RC522 RST -> GPIO22
- RC522 3.3V -> 3.3V
- RC522 GND -> GND
- Servo signal -> GPIO13
- Servo VCC -> external 5V
- Servo GND -> external GND + ESP32 GND (common ground)

## 3) Backend compatibility

Firmware calls:

- `POST /api/device/access-check/`

Request payload:

```json
{
  "uid": "A1B2C3D4",
  "source": "esp32_gate_main",
  "open_duration_ms": 3000
}
```

Expected response:

```json
{
  "allowed": true,
  "result": "allowed",
  "reason": "none",
  "message": "Accès autorisé",
  "door_action": "open",
  "open_duration_ms": 3000,
  "event_id": 123,
  "uid": "A1B2C3D4",
  "card_uuid": "..."
}
```

## 4) Python backend adjustments included

The following backend updates were made to support hardware integration:

- New endpoint: `POST /api/device/access-check/`
- Business decision inside backend using:
  - card status (`active`, `disabled`, `lost`, `expired`)
  - access schedule (`AccessRules`)
  - unpaid fees (`StudentFinancialStatus`)
  - enrollment activity
- Automatic `AccessEvent` creation for every scan
- Auto-update `Card.last_used_at` and `Card.total_uses` on allowed access
- `ALLOWED_HOSTS` made configurable via env:
  - `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.20`

## 5) Libraries

Installed via `platformio.ini`:

- ArduinoJson
- MFRC522
- ESP32Servo

## 6) Configuration

Edit `src/AppConfig.h`:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `SERVER_BASE_URL` (Django URL reachable by ESP32)
- `API_TOKEN` (DRF Token of a dedicated device user)
- servo angles and timings if needed

## 7) Create a dedicated API token

From Django shell:

```python
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
u, _ = User.objects.get_or_create(username='esp32_gate')
u.set_password('ChangeMe123!')
u.save()
t, _ = Token.objects.get_or_create(user=u)
print(t.key)
```

Put printed token into `AppConfig.h`.

## 8) Build and upload (PlatformIO)

From this folder:

```bash
pio run
pio run -t upload
pio device monitor
```

## 9) Runtime behavior

- Reads UID from RC522
- Calls backend decision endpoint
- Opens door for configured duration if allowed
- Keeps door closed if denied
- Handles Wi-Fi auto reconnect
- Uses HTTP timeout and detailed serial diagnostics
- Ignores duplicate scans within cooldown window

## 10) Production notes

- Use TLS + reverse proxy for real deployments
- Do not keep API token in plaintext for production fleet
- Isolate servo power from ESP32 USB power to avoid resets
