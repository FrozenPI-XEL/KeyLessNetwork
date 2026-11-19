#!/usr/bin/env bash
# Richtet den Autostart für den Locker-Server ein. Auf dem Pi ausführen:
#   bash install-service.sh
# Voraussetzung: main.py liegt in /home/pi/projects und "python3 main.py init ..." wurde schon ausgeführt.
set -euo pipefail

SERVICE=keylessnetwork.service
SRC="$(cd "$(dirname "$0")" && pwd)/$SERVICE"

if [ ! -f /home/pi/projects/locker.json ]; then
  echo "Fehler: /home/pi/projects/locker.json fehlt. Erst 'python3 main.py init ...' ausführen." >&2
  exit 1
fi

sudo cp "$SRC" /etc/systemd/system/$SERVICE
sudo systemctl daemon-reload
sudo systemctl enable --now systemd-time-wait-sync.service 2>/dev/null || true
sudo systemctl enable --now $SERVICE

echo
echo "Fertig. Nützliche Befehle:"
echo "  systemctl status $SERVICE        # läuft er?"
echo "  journalctl -u $SERVICE -f        # Log live ansehen"
echo "  sudo systemctl restart $SERVICE  # nach einem Update von main.py"
echo "  sudo systemctl stop $SERVICE     # anhalten (z. B. um manuell mit uvicorn zu testen)"
