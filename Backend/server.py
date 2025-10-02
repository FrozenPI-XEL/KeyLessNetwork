from flask import Flask, request, jsonify
from schloss_controll import lock, unlock
from sensor import is_door_closed
import RPi.GPIO as GPIO

app = Flask(__name__)

@app.route('/lock', methods=['POST'])
def lock_schloss():
    data = request.json
    schloss_id = data.get("schloss")
    if not is_door_closed():
        return jsonify({"success" : False, "error" : "Tür nicht geschlossen!"}), 400
    lock(schloss_id)
    return jsonify({"success": True})

@app.route('/unlock', methods=['POST'])
def unlock_schloss():
    data = request.json
    schloss_id = data.get("schloss")
    unlock(schloss_id)
    return jsonify({"success": True})

@app.route('/status', methods=['GET'])
def check_door():
    status = is_door_closed()
    return jsonify({"door_closed": status})

@app.route('/')
def hello():
    return "Lock Controller Online DigiClub e.V. Leon Ayvazian "

@app.teardown_appcontext
def cleanup(exception=None):
    GPIO.cleanup()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)