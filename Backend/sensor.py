import RPi.GPIO as GPIO
import time

TRIG = 5
ECHO = 6

GPIO.setup(TRIG, GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)

def get_distance():
    GPIO.output(TRIG, False)
    time.sleep(0.05)

    GPIO.output(TRIG, True)
    time.sleep(0.00001)
    GPIO.output(TRIG, False)

    while GPIO.input(ECHO) == 0:
        pulse_start = time.time()

    while GPIO.input(ECHO) == 1:
        pulse_end = time.time()

    pulse_duration =pulse_end - pulse_start
    distance = pulse_duration * 17150 #centimeter
    return round(distance, 2)

def is_door_closed(threshold=10):
    distance = get_distance()
    return distance < threshold #Tür ist 10cm vom Sensor entfernt

    