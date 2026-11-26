# Neuen Pi einrichten (Kurzfassung)

`<IP>` = feste IP des Pi (im Router vergeben). Details: `DOKU.md`, Abschnitt 3 C und K.

**1. PC (Git Bash, im Projektordner): Zertifikat + Dateien kopieren**
```bash
bash Backend/deploy/make-certs.sh <IP>
ssh pi@<IP> "mkdir -p ~/projects/certs"
scp Backend/main.py Backend/requirements.txt pi@<IP>:~/projects/
scp -r Backend/deploy pi@<IP>:~/projects/
scp ~/kln-ca/<IP>/server.crt ~/kln-ca/<IP>/server.key pi@<IP>:~/projects/certs/
```

**2. Pi (per SSH/Termius): installieren und einrichten**
```bash
cd ~/projects
chmod 600 certs/server.key
pip3 install --break-system-packages -r requirements.txt
timedatectl                       # "System clock synchronized: yes" muss da stehen
python3 main.py init --supabase-url https://XXXX.supabase.co --anon-key <Publishable Key> --locks 4
bash deploy/install-service.sh
systemctl status keylessnetwork   # muss "active (running)" zeigen
```
`--locks`: große Platine 4, kleine Platine 2. Den angezeigten Setup-Code `KLN1-…` kopieren.

**3. App (Admin-Tab → Locker)**
Setup-Code einfügen, Name, IP `<IP>`, Port `8443`, „HTTPS" an → speichern → beim Locker (Personen-Symbol) Nutzer freigeben.

**Nützlich**
```bash
journalctl -u keylessnetwork -f        # Log live
sudo systemctl restart keylessnetwork  # nach Update von main.py
echo "KLN_MOTOR_SECONDS=2" >> ~/projects/kln.env && sudo systemctl restart keylessnetwork  # Motorlaufzeit ändern
```
LEDs bleiben dunkel? In `/etc/systemd/system/keylessnetwork.service` `User=root` setzen, dann `sudo systemctl daemon-reload && sudo systemctl restart keylessnetwork`.
