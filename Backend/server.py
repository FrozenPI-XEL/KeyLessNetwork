from fastapi import FastAPI
import RPi.GPIO as GPIO
import time

app = FastAPI()

GPIO.setmode(GPIO.BCM)

# Zwei "Schlösser" = zwei LEDs
locks = {
    1: {"pin": 17, "state": "closed"},  # LED an GPIO 17
    2: {"pin": 27, "state": "closed"},  # LED an GPIO 27
}

# GPIO Setup
for lid, cfg in locks.items():
    GPIO.setup(cfg["pin"], GPIO.OUT)
    GPIO.output(cfg["pin"], GPIO.LOW)  # Aus = "geschlossen"


@app.get("/health")
def health():
    return {"status": "ok", "locks": list(locks.keys())}


@app.post("/lock/{lock_id}/open")
def open_lock(lock_id: int):
    if lock_id not in locks:
        return {"success": False, "error": "Invalid lock"}

    cfg = locks[lock_id]
    GPIO.output(cfg["pin"], GPIO.HIGH)  # LED AN
    cfg["state"] = "open"

    return {"success": True, "lock": lock_id, "state": cfg["state"]}


@app.post("/lock/{lock_id}/close")
def close_lock(lock_id: int):
    if lock_id not in locks:
        return {"success": False, "error": "Invalid lock"}

    cfg = locks[lock_id]
    GPIO.output(cfg["pin"], GPIO.LOW)  # LED AUS
    cfg["state"] = "closed"

    return {"success": True, "lock": lock_id, "state": cfg["state"]}


@app.get("/lock/{lock_id}/status")
def lock_status(lock_id: int):
    if lock_id not in locks:
        return {"success": False, "error": "Invalid lock"}

    cfg = locks[lock_id]
    return {"success": True, "lock": lock_id, "state": cfg["state"]}
