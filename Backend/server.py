from flask import Flask
from gpiozero import LED
from time import sleep
app = Flask(__name__)
red = LED(17)

@app.route('/on')
def turn_on():
    red.on()
    return 'LED ist an'

@app.route('/off')
def turn_off():
    red.on()
    return 'LED ist aus'

if __name__ == '__main__':
    app.run(host='0.0.0.0, port=500')