from fastapi import FastAPI
import RPi.GPIO as GPIO
import time
import board
import neopixel
import threading

app = FastAPI()

MOTOR_RUN_SECONDS = 0.1
LED_ACTIVE_SECONDS = 1.5

GPIO.setmode(GPIO.BCM)

# GPIO Pins für die Motoren
motors = {
    1: {"in1": 17, "in2": 15, "state": "closed"},
    2: {"in1": 27, "in2": 23, "state": "closed"},
}

motor_lock = threading.Lock()

for m in motors.values():
    GPIO.setup(m["in1"], GPIO.OUT)
    GPIO.setup(m["in2"], GPIO.OUT)

def motor_stop(m):
    GPIO.output(m["in1"], GPIO.LOW)
    GPIO.output(m["in2"], GPIO.LOW)

def motor_open(m,):
    GPIO.output(m["in1"], GPIO.HIGH)
    GPIO.output(m["in2"], GPIO.LOW)

def motor_close(m,):
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

@app.get("/health")
def health():
    return {"status": "ok", "motors": list(motors.keys())}

@app.post("/lock/{lock_id}/open")
def open_lock(lock_id: int):
    global animation_thread, stop_animation

    if lock_id not in motors:
        return {"success": False, "error": "Invalid lock"}

    with motor_lock:
        m = motors[lock_id]

        if m["state"] == "open":
            return {
                "success": False,
                "error": "Motor is already open. Close it first."
            }

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

        return {"success": True, "lock": lock_id, "state": m["state"]}


@app.post("/lock/{lock_id}/close")
def close_lock(lock_id: int):
    global animation_thread, stop_animation

    if lock_id not in motors:
        return {"success": False, "error": "Invalid lock"}

    with motor_lock:
        m = motors[lock_id]

        if m["state"] == "closed":
            return {
                "success": False,
                "error": "Motor is already closed. Open it first."
            }

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

        return {"success": True, "lock": lock_id, "state": m["state"]}

@app.get("/lock/{lock_id}/status")
def lock_status(lock_id: int):
    if lock_id not in motors:
        return {"success": False, "error": "Invalid lock"}

    m = motors[lock_id]
    return {"success": True, "lock": lock_id, "state": m["state"]}

