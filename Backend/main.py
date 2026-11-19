import sys, platform
if platform.system() == "Windows":
    from unittest.mock import MagicMock
    for _m in ["RPi", "RPi.GPIO", "board", "busio", "digitalio",
               "neopixel", "adafruit_blinka", "smbus", "smbus2",
               "spidev", "gpiozero", "pigpio", "mfrc522"]:
        sys.modules[_m] = MagicMock()
    print("Windows erkannt - Pi-Hardware wird simuliert")

import atexit
import hashlib
import hmac
import json
import os
import secrets
import signal
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

# ---------------------------------------------------------------------------
# Einrichtung eines Lockers (Kommandozeile, einmalig auf dem Pi):
#
#   python main.py init --supabase-url https://XXXX.supabase.co --anon-key <anon key> [--locks 4]
#       erzeugt Locker-ID und 256-Bit-Schlüssel und zeigt den Setup-Code an.
#       --locks = Anzahl der Schlösser dieser Platine (1 bis 4, Standard 4; die kleine Platine hat 2)
#   python main.py rotate
#       erzeugt einen neuen Schlüssel (gleiche Locker-ID) und einen neuen Setup-Code
#
# Den Setup-Code gibt der Admin EINMAL im Admin-Tab der App ein. Der Schlüssel läuft dabei nie
# übers Netz. Alle anderen Nutzer bekommen die Daten nach dem Login automatisch.
# ---------------------------------------------------------------------------
CONFIG_FILE = Path(os.environ.get("KLN_CONFIG_FILE", Path(__file__).with_name("locker.json")))


def _write_config(cfg: dict) -> None:
    fd = os.open(CONFIG_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(cfg, f, indent=2)
    os.chmod(CONFIG_FILE, 0o600)


def _print_setup_code(cfg: dict) -> None:
    raw = uuid.UUID(cfg["locker_id"]).hex + cfg["key_hex"]  # 32 + 64 Hex-Zeichen
    grouped = "-".join(raw[i:i + 8] for i in range(0, len(raw), 8))
    print()
    print("Locker-ID:", cfg["locker_id"])
    print("Setup-Code (in der App als Admin unter 'Locker' eingeben):")
    print()
    print("  KLN1-" + grouped)
    print()
    print("Den Code nirgends sonst speichern (kein Chat, keine Notiz). Nach der Eingabe in der App")
    print("kann er aus dem Terminal-Verlauf gelöscht werden.")


def _setup_cli(argv: list) -> None:
    cmd = argv[1]
    args = {}
    it = iter(argv[2:])
    for a in it:
        if a.startswith("--"):
            args[a] = next(it, "")

    if cmd == "init":
        if CONFIG_FILE.exists():
            sys.exit("Dieser Pi ist schon eingerichtet. Für einen neuen Schlüssel: python main.py rotate")
        url = (args.get("--supabase-url") or input("Supabase-URL: ")).strip().rstrip("/")
        anon = (args.get("--anon-key") or input("Supabase anon key: ")).strip()
        if not url.startswith("https://") or not anon:
            sys.exit("Supabase-URL muss mit https:// beginnen und der anon key darf nicht leer sein.")
        try:
            locks = int(args.get("--locks") or 4)
        except ValueError:
            locks = 0
        if locks not in (1, 2, 3, 4):
            sys.exit("--locks muss eine Zahl von 1 bis 4 sein.")
        cfg = {
            "locker_id": str(uuid.uuid4()),
            "key_hex": secrets.token_hex(32),
            "supabase_url": url,
            "supabase_anon_key": anon,
            "locks": locks,
        }
        _write_config(cfg)
        _print_setup_code(cfg)
    elif cmd == "rotate":
        if not CONFIG_FILE.exists():
            sys.exit("Noch nicht eingerichtet. Erst: python main.py init")
        cfg = json.loads(CONFIG_FILE.read_text())
        cfg["key_hex"] = secrets.token_hex(32)
        _write_config(cfg)
        _print_setup_code(cfg)
        print("Der alte Schlüssel ist ab sofort ungültig. Den neuen Code als Admin in der App eingeben.")
    else:
        sys.exit("Benutzung: python main.py init | rotate")
    sys.exit(0)


if __name__ == "__main__" and sys.argv[1:2] in (["init"], ["rotate"]):
    _setup_cli(sys.argv)

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
try:
    import RPi.GPIO as GPIO
except ImportError:
    from unittest.mock import MagicMock
    GPIO = MagicMock()
    print("Kein Pi erkannt - GPIO wird simuliert")
import board
import neopixel

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

# Nur zum Testen am PC mit der Web-Version der App (Browser): erlaubt Zugriffe von anderen Adressen.
# Auf dem echten Pi bleibt das aus, die Handy-App braucht es nicht.
if platform.system() == "Windows" or os.environ.get("KLN_CORS") == "1":
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Response-Timestamp", "X-Response-Signature"],
    )

MOTOR_RUN_SECONDS = 0.1
LED_ACTIVE_SECONDS = 1.5

GPIO.setmode(GPIO.BCM)

# GPIO Pins für die Motoren (BCM-Nummern).
# Schloss 3 = physische Pins 32 und 36 -> BCM 12 und 16
# Schloss 4 = physische Pins 38 und 40 -> BCM 20 und 21
ALL_MOTORS = {
    1: {"in1": 17, "in2": 15, "state": "closed"},
    2: {"in1": 27, "in2": 23, "state": "closed"},
    3: {"in1": 12, "in2": 16, "state": "closed"},
    4: {"in1": 20, "in2": 21, "state": "closed"},
}


def _configured_lock_count() -> int:
    """Anzahl der Schlösser dieser Platine aus locker.json (Standard 4). Nachträglich ändern: "locks" in
    locker.json anpassen und den Server neu starten."""
    try:
        return max(1, min(4, int(json.loads(CONFIG_FILE.read_text()).get("locks", 4))))
    except Exception:
        return 4


# Nur die Schlösser aktivieren, die diese Platine wirklich hat. Die App zeigt genau diese an.
motors = {k: v for k, v in ALL_MOTORS.items() if k <= _configured_lock_count()}

motor_lock = threading.Lock()

for m in motors.values():
    GPIO.setup(m["in1"], GPIO.OUT)
    GPIO.setup(m["in2"], GPIO.OUT)


# Motor-Pins beim Beenden immer stromlos machen und GPIO freigeben, egal wie der Prozess stirbt
# (Strg+C, systemd stop/restart, Absturz) - sonst bleiben die Pins in einem undefinierten Zustand.
def _cleanup_gpio(*_args):
    try:
        for m in motors.values():
            GPIO.output(m["in1"], GPIO.LOW)
            GPIO.output(m["in2"], GPIO.LOW)
        GPIO.cleanup()
    except Exception:
        pass
    if _args:
        sys.exit(0)


atexit.register(_cleanup_gpio)
signal.signal(signal.SIGTERM, _cleanup_gpio)
signal.signal(signal.SIGINT, _cleanup_gpio)


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
# Sicherheit
#
# Eine Anfrage wird nur ausgeführt, wenn ALLES stimmt:
#   1. X-Locker-Id passt zu diesem Pi
#   2. X-Signature: HMAC-SHA256 mit dem Lockerschlüssel über
#        KLN1 / METHODE / PFAD / QUERY / TIMESTAMP / NONCE / SHA256(BODY)
#   3. Zeitstempel höchstens 30 s alt, Nonce noch nie benutzt (Replay-Schutz)
#   4. Authorization: Bearer <Supabase-Login-Token>: Supabase bestätigt, dass der
#      eingeloggte Nutzer für diesen Locker freigegeben ist
# Der Pi antwortet ebenfalls signiert (X-Response-Timestamp, X-Response-Signature).
# Der Lockerschlüssel wird nie über die Verbindung zum Pi übertragen.
# ===========================================================================
TIMESTAMP_TOLERANCE_SECONDS = 30
NONCE_TTL_SECONDS = TIMESTAMP_TOLERANCE_SECONDS * 2 + 5
NONCE_MAX_ENTRIES = 10000
MAX_BODY_BYTES = 4096
MAX_TOKEN_LENGTH = 4096

MEMBER_CACHE_SECONDS = 60  # so schnell wirkt das Entziehen einer Freigabe

MAX_FAILURES = 5
FAILURE_WINDOW_SECONDS = 60
BLOCK_SECONDS = 300

_DUMMY_KEY = secrets.token_bytes(32)

_cfg_cache = {"mtime": None, "cfg": None}
_cfg_lock = threading.Lock()

_nonces = {}  # nonce -> Ablaufzeit
_nonce_lock = threading.Lock()

_failures = {}  # ip -> Liste von Zeitstempeln
_blocked_until = {}  # ip -> Zeitstempel
_fail_lock = threading.Lock()

_member_cache = {}  # sha256(token) -> Ablaufzeit
_member_lock = threading.Lock()


def _load_config() -> dict | None:
    """Lädt locker.json und liest sie neu ein, sobald sie sich ändert (z. B. nach 'rotate')."""
    with _cfg_lock:
        try:
            mtime = CONFIG_FILE.stat().st_mtime
        except FileNotFoundError:
            return None
        if _cfg_cache["mtime"] != mtime:
            raw = json.loads(CONFIG_FILE.read_text())
            cfg = {
                "locker_id": str(raw["locker_id"]).lower(),
                "key": bytes.fromhex(raw["key_hex"]),
                "supabase_url": str(raw["supabase_url"]).rstrip("/"),
                "anon": str(raw["supabase_anon_key"]),
            }
            if len(cfg["key"]) < 32:
                return None
            _cfg_cache["cfg"] = cfg
            _cfg_cache["mtime"] = mtime
        return _cfg_cache["cfg"]


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


def _nonce_seen_or_store(nonce: str) -> bool:
    """True, wenn die Nonce schon benutzt wurde (Replay). Sonst wird sie gespeichert."""
    now = time.time()
    with _nonce_lock:
        if len(_nonces) > NONCE_MAX_ENTRIES // 2:
            for k in [k for k, exp in _nonces.items() if exp < now]:
                del _nonces[k]
        if len(_nonces) >= NONCE_MAX_ENTRIES:
            return True  # lieber ablehnen als den Speicher fluten
        if nonce in _nonces:
            return True
        _nonces[nonce] = now + NONCE_TTL_SECONDS
        return False


def _check_membership(token: str, cfg: dict):
    """Fragt Supabase, ob der Nutzer hinter diesem Login-Token den Locker öffnen darf.
    True = ja, False = nein, None = Supabase nicht erreichbar (dann wird abgelehnt)."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = time.time()
    with _member_lock:
        exp = _member_cache.get(token_hash)
        if exp and exp > now:
            return True

    req = urllib.request.Request(
        f"{cfg['supabase_url']}/rest/v1/rpc/kln_can_access",
        data=json.dumps({"p_locker": cfg["locker_id"]}).encode(),
        headers={
            "apikey": cfg["anon"],
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            result = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        # 401/403: Token ungültig oder abgelaufen -> kein Zugriff
        return False if e.code in (401, 403) else None
    except Exception:
        return None

    if result is True:
        with _member_lock:
            if len(_member_cache) > 1000:
                for k in [k for k, v in _member_cache.items() if v < now]:
                    del _member_cache[k]
            _member_cache[token_hash] = now + MEMBER_CACHE_SECONDS
        return True
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
    def __init__(self, key: bytes, nonce: str):
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

    cfg = _load_config()
    if cfg is None:
        raise HTTPException(status_code=503, detail="Not configured")

    locker_id = request.headers.get("X-Locker-Id", "").lower()
    timestamp = request.headers.get("X-Timestamp", "")
    nonce = request.headers.get("X-Nonce", "")
    signature = request.headers.get("X-Signature", "")
    auth_header = request.headers.get("Authorization", "")

    if not (locker_id and timestamp and nonce and signature and auth_header.startswith("Bearer ")):
        raise _reject(request)
    token = auth_header[7:].strip()
    if not token or len(token) > MAX_TOKEN_LENGTH or len(nonce) < 16 or len(nonce) > 64:
        raise _reject(request)

    body = await request.body()
    if len(body) > MAX_BODY_BYTES:
        raise _reject(request)

    expected = hmac.new(
        cfg["key"], _canonical_request(request, timestamp, nonce, body), hashlib.sha256
    ).hexdigest()
    signature_ok = hmac.compare_digest(expected, signature.lower())
    id_ok = hmac.compare_digest(locker_id, cfg["locker_id"])

    try:
        ts_ok = abs(time.time() - int(timestamp)) <= TIMESTAMP_TOLERANCE_SECONDS
    except ValueError:
        ts_ok = False

    if not (signature_ok and id_ok and ts_ok):
        raise _reject(request)

    # Nonce erst nach gültiger Signatur speichern, damit Fremde den Speicher nicht füllen können.
    if _nonce_seen_or_store(nonce):
        raise _reject(request)

    # Erst jetzt wird Supabase gefragt (so kann niemand ohne Schlüssel Anfragen dorthin auslösen).
    allowed = await run_in_threadpool(_check_membership, token, cfg)
    if allowed is None:
        raise HTTPException(status_code=503, detail="Auth service unavailable")
    if not allowed:
        raise _reject(request)

    return Auth(cfg["key"], nonce)


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
# Start:  python main.py   (oder wie bisher:  uvicorn main:app --host 0.0.0.0 --port 8443)
# Optional mit TLS über KLN_TLS_CERT / KLN_TLS_KEY.
# ===========================================================================
if __name__ == "__main__":
    import uvicorn

    if _load_config() is None:
        sys.exit("Noch nicht eingerichtet. Erst: python main.py init --supabase-url ... --anon-key ...")
    cert = os.environ.get("KLN_TLS_CERT")
    key = os.environ.get("KLN_TLS_KEY")
    if cert and key:
        uvicorn.run(app, host="0.0.0.0", port=8443, ssl_certfile=cert, ssl_keyfile=key)
    else:
        print("Hinweis: Start ohne TLS. Der Lockerschlüssel wird nie übertragen, TLS ist trotzdem empfohlen.")
        uvicorn.run(app, host="0.0.0.0", port=8443)
