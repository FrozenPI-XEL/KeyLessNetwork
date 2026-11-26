"""Tests für den Pi-Server (ohne Hardware: GPIO, Board und LEDs werden simuliert).

Ausführen im Ordner Backend:
    pip install -r requirements-dev.txt
    python -m pytest
"""
import asyncio
import hashlib
import hmac
import json
import os
import sys
import time
import uuid
from pathlib import Path
from unittest.mock import MagicMock

import pytest

KEY_HEX = "11" * 32
LOCKER_ID = str(uuid.uuid4())


@pytest.fixture(scope="module")
def main(tmp_path_factory):
    cfg = tmp_path_factory.mktemp("cfg") / "locker.json"
    cfg.write_text(
        json.dumps(
            {
                "locker_id": LOCKER_ID,
                "key_hex": KEY_HEX,
                "supabase_url": "https://example.supabase.co",
                "supabase_anon_key": "anon",
                "locks": 2,
            }
        )
    )
    os.environ["KLN_CONFIG_FILE"] = str(cfg)
    os.environ.pop("KLN_ALLOW_HTTP", None)
    for name in ("RPi", "RPi.GPIO", "board", "neopixel"):
        sys.modules[name] = MagicMock()
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    import main as mod

    mod.ALLOW_HTTP = False
    mod.LED_STEP_SECONDS = 0.01
    mod.MOTOR_RUN_SECONDS = 0.01
    mod.LED_ACTIVE_SECONDS = 0
    return mod


@pytest.fixture(autouse=True)
def clean_state(main):
    main._nonces.clear()
    main._failures.clear()
    main._blocked_until.clear()
    main._member_cache.clear()
    for m in main.motors.values():
        m["state"] = "closed"
    main._check_membership = lambda token, cfg: True
    yield


def make_request(method, path, headers=None, body=b"", scheme="https", ip="10.0.0.5"):
    from fastapi import Request

    scope = {
        "type": "http",
        "method": method,
        "path": path,
        "raw_path": path.encode(),
        "root_path": "",
        "query_string": b"",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "scheme": scheme,
        "server": ("pi", 8443),
        "client": (ip, 40000),
    }

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    return Request(scope, receive)


def signed_headers(method, path, body=b"", ts=None, nonce=None, key_hex=KEY_HEX):
    ts = str(int(time.time()) if ts is None else ts)
    nonce = nonce or uuid.uuid4().hex
    canonical = "\n".join(
        ["KLN1", method, path, "", ts, nonce, hashlib.sha256(body).hexdigest()]
    ).encode()
    sig = hmac.new(bytes.fromhex(key_hex), canonical, hashlib.sha256).hexdigest()
    return {
        "X-Locker-Id": LOCKER_ID,
        "X-Timestamp": ts,
        "X-Nonce": nonce,
        "X-Signature": sig,
        "Authorization": "Bearer user-token",
    }


def auth(main, request):
    return asyncio.run(main.authenticate(request))


def status_of(main, request):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        auth(main, request)
    return exc.value.status_code


# --- Authentifizierung -------------------------------------------------------


def test_valid_request_is_accepted(main):
    req = make_request("GET", "/health", signed_headers("GET", "/health"))
    result = auth(main, req)
    assert result.key == bytes.fromhex(KEY_HEX)


def test_wrong_key_is_rejected_and_counted(main):
    req = make_request("GET", "/health", signed_headers("GET", "/health", key_hex="22" * 32))
    assert status_of(main, req) == 401
    assert len(main._failures["10.0.0.5"]) == 1


def test_replayed_nonce_is_rejected(main):
    headers = signed_headers("GET", "/health")
    auth(main, make_request("GET", "/health", headers))
    assert status_of(main, make_request("GET", "/health", headers)) == 401


def test_old_timestamp_is_rejected(main):
    headers = signed_headers("GET", "/health", ts=int(time.time()) - 120)
    assert status_of(main, make_request("GET", "/health", headers)) == 401


def test_signature_covers_path(main):
    headers = signed_headers("POST", "/lock/1/open")
    assert status_of(main, make_request("POST", "/lock/2/open", headers)) == 401


def test_user_without_access_is_rejected(main):
    main._check_membership = lambda token, cfg: False
    req = make_request("GET", "/health", signed_headers("GET", "/health"))
    assert status_of(main, req) == 401


def test_supabase_unreachable_gives_503(main):
    main._check_membership = lambda token, cfg: None
    req = make_request("GET", "/health", signed_headers("GET", "/health"))
    assert status_of(main, req) == 503


def test_ip_is_blocked_after_too_many_failures(main):
    for _ in range(main.MAX_FAILURES):
        bad = signed_headers("GET", "/health", key_hex="22" * 32)
        status_of(main, make_request("GET", "/health", bad))
    good = make_request("GET", "/health", signed_headers("GET", "/health"))
    assert status_of(main, good) == 429


def test_response_signature_can_be_verified(main):
    a = main.Auth(bytes.fromhex(KEY_HEX), "abc")
    resp = main.signed_response(a, {"ok": True})
    msg = "\n".join(
        [
            "KLN1-RESP",
            "abc",
            resp.headers["X-Response-Timestamp"],
            "200",
            hashlib.sha256(resp.body).hexdigest(),
        ]
    ).encode()
    expected = hmac.new(bytes.fromhex(KEY_HEX), msg, hashlib.sha256).hexdigest()
    assert resp.headers["X-Response-Signature"] == expected


# --- TLS-Pflicht ---------------------------------------------------------------


def test_plain_http_is_refused(main):
    async def call_next(_request):
        raise AssertionError("darf ohne TLS nicht erreicht werden")

    resp = asyncio.run(main.require_tls(make_request("GET", "/health", scheme="http"), call_next))
    assert resp.status_code == 426


def test_https_is_passed_through(main):
    sentinel = object()

    async def call_next(_request):
        return sentinel

    assert asyncio.run(main.require_tls(make_request("GET", "/health"), call_next)) is sentinel


# --- Motoren und LED-Animation -------------------------------------------------


def test_animation_stops_even_if_stopped_before_thread_runs(main):
    # Der alte Fehler: Stop kam, bevor der Thread lief -> Animation lief endlos.
    anim = main.LedAnimation((0, 255, 0, 0))
    anim._stop.set()
    anim.start()
    anim._thread.join(timeout=1)
    assert not anim._thread.is_alive()


def test_open_and_close_finish_and_release_lock(main):
    a = main.Auth(bytes.fromhex(KEY_HEX), "n")
    started = time.time()
    resp = main._move_lock(1, "open", a)
    assert json.loads(resp.body)["state"] == "open"
    resp = main._move_lock(1, "closed", a)
    assert json.loads(resp.body)["state"] == "closed"
    assert time.time() - started < 3
    assert main.motor_lock.acquire(timeout=0.1)
    main.motor_lock.release()


def test_open_twice_reports_hint(main):
    a = main.Auth(bytes.fromhex(KEY_HEX), "n")
    main._move_lock(1, "open", a)
    data = json.loads(main._move_lock(1, "open", a).body)
    assert data["success"] is False and "already open" in data["error"]


def test_only_configured_locks_exist(main):
    assert sorted(main.motors) == [1, 2]
    a = main.Auth(bytes.fromhex(KEY_HEX), "n")
    data = json.loads(main._move_lock(3, "open", a).body)
    assert data == {"success": False, "error": "Invalid lock"}
