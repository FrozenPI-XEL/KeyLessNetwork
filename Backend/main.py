import hashlib
import hmac
import json
import os
import secrets
import sys
import threading
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Schlüsselverwaltung (Kommandozeile):  python main.py genkey <geraete-id>
# Erzeugt einen 256-Bit-Schlüssel für ein Gerät (z. B. ein Handy) und legt ihn
# in keys.json ab. Den ausgegebenen Schlüssel einmalig in die App eintragen.
# ---------------------------------------------------------------------------
KEYS_FILE = Path(os.environ.get("KLN_KEYS_FILE", Path(__file__).with_name("keys.json")))


def _genkey_cli(device_id: str) -> None:
    keys = {}
    if KEYS_FILE.exists():
        keys = json.loads(KEYS_FILE.read_text())
    if device_id in keys:
        print(f"Gerät '{device_id}' existiert schon. Zum Ersetzen erst aus keys.json löschen.")
        sys.exit(1)
    key_hex = secrets.token_hex(32)
    keys[device_id] = key_hex
    KEYS_FILE.write_text(json.dumps(keys, indent=2))
    os.chmod(KEYS_FILE, 0o600)
    print(f"Geräte-ID: {device_id}")
    print(f"Schlüssel: {key_hex}")
    print("Diesen Schlüssel nur einmal sicher in die App übertragen und nirgends sonst speichern.")
    sys.exit(0)


if __name__ == "__main__" and sys.argv[1:2] == ["genkey"]:
    if len(sys.argv) != 3:
        print("Benutzung: python main.py genkey <geraete-id>")
        sys.exit(1)
    _genkey_cli(sys.argv[2])

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import Response
import RPi.GPIO as GPIO
import board
import neopixel

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

MOTOR_RUN_SECONDS = 0.1
LED_ACTIVE_SECONDS = 1.5

GPIO.setmode(GPIO.BCM)

# GPIO Pins für die Motoren (BCM-Nummern).
# Schloss 3 = physische Pins 32 und 36 -> BCM 12 und 16
# Schloss 4 = physische Pins 38 und 40 -> BCM 20 und 21
motors = {
    1: {"in1": 17, "in2": 15, "state": "closed"},
    2: {"in1": 27, "in2": 23, "state": "closed"},
    3: {"in1": 12, "in2": 16, "state": "closed"},
    4: {"in1": 20, "in2": 21, "state": "closed"},
}

motor_lock = threading.Lock()

for m in motors.values():
    GPIO.setup(m["in1"], GPIO.OUT)
    GPIO.setup(m["in2"], GPIO.OUT)


def motor_stop(m):
    GPIO.output(m["in1"], GPIO.LOW)
    GPIO.output(m["in2"], GPIO.LOW)


def motor_open(m):
    GPIO.output(m["in1"], GPIO.HIGH)
    GPIO.output(m["in2"], GPIO.LOW)


def motor_close(m):
    GPIO.output(m["in1"], GPIO.LOW)
    GPIO.output(m["in2"], GPIO.HIGH)


# SK6812 LED Setup
NUM_LEDS = 15
LED_PIN = board.D18
pixels = neopixel.NeoPixel(
    LED_PIN, NUM_LEDS, brightness=0.3, auto_write=True, pixel_order=neopixel.GRBW
)
led_lock = threading.Lock()
animation_thread = None
stop_animation = False


def rotate_led(color):
    global stop_animation
    stop_animation = False
    while not stop_animation:
        for i in range(NUM_LEDS):
            if stop_animation:
                break
            with led_lock:
                pixels.fill((0, 0, 0, 0))
                pixels[i] = color
            time.sleep(0.2)
    with led_lock:
        pixels.fill((0, 0, 0, 0))


def set_status_leds(state: str | None = None, duration: float | None = None):
    if state == "open":
        color = (0, 255, 0, 0)
    elif state == "closed":
        color = (255, 0, 0, 0)
    else:
        color = (0, 0, 0, 0)

    with led_lock:
        pixels.fill(color)

    if duration is not None:
        time.sleep(duration)
        with led_lock:
            pixels.fill((0, 0, 0, 0))


# ===========================================================================
# Sicherheit: signierte Anfragen und signierte Antworten
#
# Jede Anfrage trägt vier Header:
#   X-Device-Id, X-Timestamp, X-Nonce, X-Signature
# Signatur = HMAC-SHA256(geraeteschluessel, kanonischer String)
# Kanonischer String (Zeilen mit \n getrennt):
#   KLN1 / METHODE / PFAD / QUERY / TIMESTAMP / NONCE / SHA256(BODY) hex
# Der Pi antwortet ebenfalls signiert (X-Response-Timestamp, X-Response-Signature),
# sodass die App prüfen kann, dass die Antwort wirklich vom Pi kommt.
# ===========================================================================
TIMESTAMP_TOLERANCE_SECONDS = 30
NONCE_TTL_SECONDS = TIMESTAMP_TOLERANCE_SECONDS * 2 + 5
NONCE_MAX_ENTRIES = 10000
MAX_BODY_BYTES = 4096

MAX_FAILURES = 5
FAILURE_WINDOW_SECONDS = 60
BLOCK_SECONDS = 300

_DUMMY_KEY = secrets.token_bytes(32)

_keys_cache = {"mtime": None, "keys": {}}
_keys_lock = threading.Lock()

_nonces = {}  # (device_id, nonce) -> Ablaufzeit
_nonce_lock = threading.Lock()

_failures = {}  # ip -> Liste von Zeitstempeln
_blocked_until = {}  # ip -> Zeitstempel
_fail_lock = threading.Lock()


def _load_keys() -> dict:
    """Lädt keys.json und liest sie neu ein, sobald sie sich ändert (Schlüssel widerrufen ohne Neustart)."""
    with _keys_lock:
        try:
            mtime = KEYS_FILE.stat().st_mtime
        except FileNotFoundError:
            return {}
        if _keys_cache["mtime"] != mtime:
            raw = json.loads(KEYS_FILE.read_text())
            keys = {}
            for dev, key_hex in raw.items():
                key = bytes.fromhex(key_hex)
                if len(key) >= 32:
                    keys[dev] = key
            _keys_cache["keys"] = keys
            _keys_cache["mtime"] = mtime
        return _keys_cache["keys"]


def _is_blocked(ip: str) -> bool:
    with _fail_lock:
        until = _blocked_until.get(ip)
        if until and until > time.time():
            return True
        if until:
            del _blocked_until[ip]
        return False


def _register_failure(ip: str) -> None:
    now = time.time()
    with _fail_lock:
        recent = [t for t in _failures.get(ip, []) if now - t < FAILURE_WINDOW_SECONDS]
        recent.append(now)
        _failures[ip] = recent
        if len(recent) >= MAX_FAILURES:
            _blocked_until[ip] = now + BLOCK_SECONDS
            _failures[ip] = []


def _nonce_seen_or_store(device_id: str, nonce: str) -> bool:
    """True, wenn die Nonce schon benutzt wurde (Replay). Sonst wird sie gespeichert."""
    now = time.time()
    with _nonce_lock:
        if len(_nonces) > NONCE_MAX_ENTRIES // 2:
            for k in [k for k, exp in _nonces.items() if exp < now]:
                del _nonces[k]
        if len(_nonces) >= NONCE_MAX_ENTRIES:
            return True  # lieber ablehnen als den Speicher fluten
        if (device_id, nonce) in _nonces:
            return True
        _nonces[(device_id, nonce)] = now + NONCE_TTL_SECONDS
        return False


def _canonical_request(request: Request, timestamp: str, nonce: str, body: bytes) -> bytes:
    parts = [
        "KLN1",
        request.method.upper(),
        request.url.path,
        request.url.query,
        timestamp,
        nonce,
        hashlib.sha256(body).hexdigest(),
    ]
    return "\n".join(parts).encode()


class Auth:
    def __init__(self, device_id: str, key: bytes, nonce: str):
        self.device_id = device_id
        self.key = key
        self.nonce = nonce


def _reject(request: Request) -> HTTPException:
    ip = request.client.host if request.client else "unknown"
    _register_failure(ip)
    # Bewusst immer dieselbe nichtssagende Antwort, damit Angreifer nichts lernen.
    return HTTPException(status_code=401, detail="Unauthorized")


async def authenticate(request: Request) -> Auth:
    ip = request.client.host if request.client else "unknown"
    if _is_blocked(ip):
        raise HTTPException(status_code=429, detail="Too many failed attempts")

    device_id = request.headers.get("X-Device-Id", "")
    timestamp = request.headers.get("X-Timestamp", "")
    nonce = request.headers.get("X-Nonce", "")
    signature = request.headers.get("X-Signature", "")

    if not (device_id and timestamp and nonce and signature):
        raise _reject(request)
    if len(nonce) < 16 or len(nonce) > 64 or len(device_id) > 64:
        raise _reject(request)

    body = await request.body()
    if len(body) > MAX_BODY_BYTES:
        raise _reject(request)

    key = _load_keys().get(device_id)
    key_to_use = key if key is not None else _DUMMY_KEY

    expected = hmac.new(
        key_to_use, _canonical_request(request, timestamp, nonce, body), hashlib.sha256
    ).hexdigest()
    signature_ok = hmac.compare_digest(expected, signature.lower())

    try:
        ts_ok = abs(time.time() - int(timestamp)) <= TIMESTAMP_TOLERANCE_SECONDS
    except ValueError:
        ts_ok = False

    if key is None or not signature_ok or not ts_ok:
        raise _reject(request)

    # Nonce erst nach gültiger Signatur speichern, damit Fremde den Speicher nicht füllen können.
    if _nonce_seen_or_store(device_id, nonce):
        raise _reject(request)

    return Auth(device_id, key, nonce)


def signed_response(auth: Auth, payload: dict, status_code: int = 200) -> Response:
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    resp_ts = str(int(time.time()))
    message = "\n".join(
        [
            "KLN1-RESP",
            auth.nonce,
            resp_ts,
            str(status_code),
            hashlib.sha256(body).hexdigest(),
        ]
    ).encode()
    sig = hmac.new(auth.key, message, hashlib.sha256).hexdigest()
    return Response(
        content=body,
        status_code=status_code,
        media_type="application/json",
        headers={
            "X-Response-Timestamp": resp_ts,
            "X-Response-Signature": sig,
            "Cache-Control": "no-store",
        },
    )


# ===========================================================================
# Endpunkte
# ===========================================================================
@app.get("/health")
def health(auth: Auth = Depends(authenticate)):
    return signed_response(auth, {"status": "ok", "motors": list(motors.keys())})


@app.post("/lock/{lock_id}/open")
def open_lock(lock_id: int, auth: Auth = Depends(authenticate)):
    global animation_thread, stop_animation

    if lock_id not in motors:
        return signed_response(auth, {"success": False, "error": "Invalid lock"})

    with motor_lock:
        m = motors[lock_id]

        if m["state"] == "open":
            return signed_response(
                auth,
                {"success": False, "error": "Motor is already open. Close it first."},
            )

        stop_animation = True
        if animation_thread:
            animation_thread.join()

        animation_thread = threading.Thread(
            target=rotate_led,
            args=((0, 255, 0, 0),)
        )
        animation_thread.start()

        motor_open(m)
        time.sleep(MOTOR_RUN_SECONDS)
        motor_stop(m)

        m["state"] = "open"

        stop_animation = True
        animation_thread.join()
        set_status_leds(m["state"], duration=LED_ACTIVE_SECONDS)

        return signed_response(
            auth, {"success": True, "lock": lock_id, "state": m["state"]}
        )


@app.post("/lock/{lock_id}/close")
def close_lock(lock_id: int, auth: Auth = Depends(authenticate)):
    global animation_thread, stop_animation

    if lock_id not in motors:
        return signed_response(auth, {"success": False, "error": "Invalid lock"})

    with motor_lock:
        m = motors[lock_id]

        if m["state"] == "closed":
            return signed_response(
                auth,
                {"success": False, "error": "Motor is already closed. Open it first."},
            )

        stop_animation = True
        if animation_thread:
            animation_thread.join()

        animation_thread = threading.Thread(
            target=rotate_led,
            args=((255, 0, 0, 0),)
        )
        animation_thread.start()

        motor_close(m)
        time.sleep(MOTOR_RUN_SECONDS)
        motor_stop(m)

        m["state"] = "closed"

        stop_animation = True
        animation_thread.join()
        set_status_leds(m["state"], duration=LED_ACTIVE_SECONDS)

        return signed_response(
            auth, {"success": True, "lock": lock_id, "state": m["state"]}
        )


@app.get("/lock/{lock_id}/status")
def lock_status(lock_id: int, auth: Auth = Depends(authenticate)):
    if lock_id not in motors:
        return signed_response(auth, {"success": False, "error": "Invalid lock"})

    with motor_lock:
        state = motors[lock_id]["state"]
    return signed_response(auth, {"success": True, "lock": lock_id, "state": state})


# ===========================================================================
# Start mit TLS:  python main.py
# Zertifikat und Schlüssel per Umgebungsvariablen KLN_TLS_CERT / KLN_TLS_KEY.
# Ohne TLS startet der Server nur, wenn KLN_ALLOW_INSECURE=1 gesetzt ist (nur zum Testen!).
# ===========================================================================
if __name__ == "__main__":
    import uvicorn

    cert = os.environ.get("KLN_TLS_CERT")
    key = os.environ.get("KLN_TLS_KEY")
    if not _load_keys():
        sys.exit("Keine Geräteschlüssel gefunden. Erst 'python main.py genkey <geraete-id>' ausführen.")
    if cert and key:
        uvicorn.run(app, host="0.0.0.0", port=8443, ssl_certfile=cert, ssl_keyfile=key)
    elif os.environ.get("KLN_ALLOW_INSECURE") == "1":
        print("WARNUNG: Start ohne TLS, nur zum Testen!")
        uvicorn.run(app, host="0.0.0.0", port=8000)
    else:
        sys.exit("KLN_TLS_CERT und KLN_TLS_KEY setzen (oder zum Testen KLN_ALLOW_INSECURE=1).")
