from fastapi import FastAPI
import RPi.GPIO as GPIO
import time
import board
import neopixel
import threading

app = FastAPI()

GPIO.setmode(GPIO.BCM)

# GPIO Pins für die Motoren
motors = {
    1: {"in1": 17, "in2": 15,  "state": "stopped"},
    2: {"in1": 27, "in2": 23,  "state": "stopped"},
}


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

def set_status_leds():
    with led_lock:
        for m in motors.values():
            if m["state"] == "open":
                pixels.fill((0, 255, 0, 0))  # Grün
            elif m["state"] == "closed":
                pixels.fill((255, 0, 0, 0))  # Rot
            else:
                pixels.fill((0, 0, 0, 0))

@app.get("/health")
def health():
    return {"status": "ok", "motors": list(motors.keys())}

@app.post("/lock/{lock_id}/open")
def open_lock(lock_id: int):
    global animation_thread, stop_animation
    if lock_id not in motors:
        return {"success": False, "error": "Invalid lock"}

    m = motors[lock_id]

    # Starte rotierende Animation
    stop_animation = True
    if animation_thread:
        animation_thread.join()
    animation_thread = threading.Thread(target=rotate_led, args=((0, 255, 0, 0),))
    animation_thread.start()

    motor_open(m)
    time.sleep(2)
    motor_stop(m)
    m["state"] = "open"

    stop_animation = True
    animation_thread.join()
    set_status_leds()

    return {"success": True, "lock": lock_id, "state": m["state"]}

@app.post("/lock/{lock_id}/close")
def close_lock(lock_id: int):
    global animation_thread, stop_animation
    if lock_id not in motors:
        return {"success": False, "error": "Invalid lock"}

    m = motors[lock_id]

    # Starte rotierende Animation
    stop_animation = True
    if animation_thread:
        animation_thread.join()
    animation_thread = threading.Thread(target=rotate_led, args=((255, 0, 0, 0),))
    animation_thread.start()

    motor_close(m)
    time.sleep(2)
    motor_stop(m)
    m["state"] = "closed"

    stop_animation = True
    animation_thread.join()
    set_status_leds()

    return {"success": True, "lock": lock_id, "state": m["state"]}

@app.get("/lock/{lock_id}/status")
def lock_status(lock_id: int):
    if lock_id not in motors:
        return {"success": False, "error": "Invalid lock"}

    m = motors[lock_id]
    return {"success": True, "lock": lock_id, "state": m["state"]}

@app.get("/rainbow")
def rainbow():
    def wheel(pos):
        pos = pos % 256
        if pos < 85:
            return (255 - pos*3, pos*3, 0, 0)
        elif pos < 170:
            pos -= 85
            return (0, 255 - pos*3, pos*3, 0)
        else:
            pos -= 170
            return (pos*3, 0, 255 - pos*3, 0)

    global animation_thread, stop_animation
    stop_animation = True
    if animation_thread:
        animation_thread.join()

    def rainbow_animation():
        global stop_animation
        stop_animation = False
        while not stop_animation:
            for i in range(256):
                if stop_animation:
                    break
                with led_lock:
                    for j in range(NUM_LEDS):
                        pixels[j] = wheel((i + j*8) & 255)
                time.sleep(0.05)
        with led_lock:
            pixels.fill((0, 0, 0, 0))

    animation_thread = threading.Thread(target=rainbow_animation)
    animation_thread.start()
    return {"success": True, "effect": "rainbow"}
