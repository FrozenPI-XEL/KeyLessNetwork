from fastapi import FastAPI
import RPi.GPIO as GPIO
import time

app = FastAPI()

GPIO.setmode(GPIO.BCM)

# GPIO Pins für die Motoren
motors = {
    1: {"in1": 17, "in2": 18, "ena": 22, "state": "stopped"},
    2: {"in1": 27, "in2": 23, "ena": 24, "state": "stopped"},
}


for m in motors.values():
    GPIO.setup(m["in1"], GPIO.OUT)
    GPIO.setup(m["in2"], GPIO.OUT)
    GPIO.setup(m["ena"], GPIO.OUT)
    m["pwm"] = GPIO.PWM(m["ena"], 1000)  # 1 kHz PWM
    m["pwm"].start(0)

def motor_stop(m):
    GPIO.output(m["in1"], GPIO.LOW)
    GPIO.output(m["in2"], GPIO.LOW)
    m["pwm"].ChangeDutyCycle(0)

def motor_open(m, speed=80):
    GPIO.output(m["in1"], GPIO.HIGH)
    GPIO.output(m["in2"], GPIO.LOW)
    m["pwm"].ChangeDutyCycle(speed)

def motor_close(m, speed=80):
    GPIO.output(m["in1"], GPIO.LOW)
    GPIO.output(m["in2"], GPIO.HIGH)
    m["pwm"].ChangeDutyCycle(speed)

@app.get("/health")
def health():
    return {"status": "ok", "motors": list(motors.keys())}

@app.post("/lock/{lock_id}/open")
def open_lock(lock_id: int):
    if lock_id not in motors:
        return {"success": False, "error": "Invalid lock"}

    m = motors[lock_id]
    motor_open(m)
    time.sleep(2)   # Motor 2 Sekunden laufen lassen
    motor_stop(m)
    m["state"] = "open"

    return {"success": True, "lock": lock_id, "state": m["state"]}

@app.post("/lock/{lock_id}/close")
def close_lock(lock_id: int):
    if lock_id not in motors:
        return {"success": False, "error": "Invalid lock"}

    m = motors[lock_id]
    motor_close(m)
    time.sleep(2)
    motor_stop(m)
    m["state"] = "closed"

    return {"success": True, "lock": lock_id, "state": m["state"]}

@app.get("/lock/{lock_id}/status")
def lock_status(lock_id: int):
    if lock_id not in motors:
        return {"success": False, "error": "Invalid lock"}

    m = motors[lock_id]
    return {"success": True, "lock": lock_id, "state": m["state"]}
