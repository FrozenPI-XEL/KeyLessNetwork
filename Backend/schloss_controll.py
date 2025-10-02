import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)

SCHLOSS1_IN1 =17
SCHLOSS1_IN2 =18

SCHLOSS2_IN1 =22
SCHLOSS2_IN2 =23

SCHLOSS_PINS = [(SCHLOSS1_IN1, SCHLOSS1_IN2), (SCHLOSS2_IN1, SCHLOSS2_IN2)]

for pin_pair in SCHLOSS_PINS:
    for pin in pin_pair:
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.LOW)


def lock(schloss_index):
    in1, in2 = SCHLOSS_PINS[schloss_index]
    GPIO.output(in1, GPIO.HIGH)
    GPIO.output(in2, GPIO.LOW)
    time.sleep()
    GPIO.output(in1, GPIO.LOW)
    GPIO.output(in2, GPIO.LOW)

def unlock(schloss_index):
    in1, in2 = SCHLOSS_PINS[schloss_index]
    GPIO.output(in1, GPIO.LOW)
    GPIO.output(in2, GPIO.HIGH)
    time.sleep()
    GPIO.output(in1, GPIO.LOW)
    GPIO.output(in2, GPIO.LOW)
