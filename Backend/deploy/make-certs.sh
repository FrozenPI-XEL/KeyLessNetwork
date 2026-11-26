#!/usr/bin/env bash
# Erzeugt eine eigene Zertifizierungsstelle (CA) fürs MakerLab und damit ein TLS-Zertifikat für einen Pi.
#
# Am besten auf dem PC ausführen (Git Bash unter Windows hat openssl dabei), NICHT auf dem Pi:
# Der private CA-Schlüssel darf nie auf einem Pi liegen. Wer ihn hat, kann Zertifikate für jeden Pi ausstellen.
#
#   bash make-certs.sh <IP des Pi> [weitere Namen, z. B. locker1.local]
#
# Ergebnis:
#   ~/kln-ca/kln-ca.key                 privater CA-Schlüssel   -> geheim halten, sichern, NIE ins Repo
#   ~/kln-ca/kln-ca.crt                 öffentliches CA-Zertifikat
#   Frontend/certs/kln-ca.pem           Kopie davon für die App (öffentlich, darf ins Repo)
#   ~/kln-ca/<ip>/server.crt + .key     Zertifikat für diesen Pi -> nach /home/pi/projects/certs/ kopieren
#
# Die CA wird nur beim ersten Aufruf erzeugt. Für jeden weiteren Pi das Skript einfach erneut mit dessen IP aufrufen.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Benutzung: bash make-certs.sh <IP des Pi> [weitere Namen ...]" >&2
  exit 1
fi

CA_DIR="${KLN_CA_DIR:-$HOME/kln-ca}"
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$CA_DIR"
chmod 700 "$CA_DIR"

if [ ! -f "$CA_DIR/kln-ca.key" ]; then
  echo "Erzeuge neue MakerLab-CA in $CA_DIR ..."
  openssl ecparam -name prime256v1 -genkey -noout -out "$CA_DIR/kln-ca.key"
  chmod 600 "$CA_DIR/kln-ca.key"
  openssl req -x509 -new -key "$CA_DIR/kln-ca.key" -sha256 -days 3650 \
    -subj "/CN=KeyLessNetwork MakerLab CA" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -out "$CA_DIR/kln-ca.crt"
fi

mkdir -p "$REPO_DIR/Frontend/certs"
cp "$CA_DIR/kln-ca.crt" "$REPO_DIR/Frontend/certs/kln-ca.pem"

PRIMARY="$1"
OUT="$CA_DIR/$PRIMARY"
mkdir -p "$OUT"

SAN=""
for name in "$@"; do
  if [[ "$name" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    SAN="${SAN:+$SAN,}IP:$name"
  else
    SAN="${SAN:+$SAN,}DNS:$name"
  fi
done

openssl ecparam -name prime256v1 -genkey -noout -out "$OUT/server.key"
chmod 600 "$OUT/server.key"
openssl req -new -key "$OUT/server.key" -subj "/CN=$PRIMARY" -out "$OUT/server.csr"
cat > "$OUT/ext.cnf" <<EXT
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature
extendedKeyUsage=serverAuth
subjectAltName=$SAN
EXT
# 825 Tage: längste Laufzeit, die iOS bei eigenen CAs akzeptiert.
openssl x509 -req -in "$OUT/server.csr" -CA "$CA_DIR/kln-ca.crt" -CAkey "$CA_DIR/kln-ca.key" \
  -CAcreateserial -days 825 -sha256 -extfile "$OUT/ext.cnf" -out "$OUT/server.crt"
rm -f "$OUT/server.csr" "$OUT/ext.cnf"

echo
echo "Fertig. Zertifikat für $PRIMARY ($SAN), gültig 825 Tage."
echo
echo "1. Auf den Pi kopieren (Termius SFTP oder scp):"
echo "     $OUT/server.crt  ->  /home/pi/projects/certs/server.crt"
echo "     $OUT/server.key  ->  /home/pi/projects/certs/server.key   (danach: chmod 600)"
echo "2. Frontend/certs/kln-ca.pem committen und die App neu bauen (Android vertraut der CA dann automatisch)."
echo "3. iOS: kln-ca.crt aufs iPhone schicken, als Profil installieren und unter"
echo "   Einstellungen > Allgemein > Info > Zertifikatsvertrauenseinstellungen voll vertrauen."
echo "4. Im Admin-Tab beim Locker 'HTTPS' anhaken und als Adresse $PRIMARY eintragen."
echo
echo "Den Ordner $CA_DIR sichern (Passwortmanager oder verschlüsselter Stick). Ohne kln-ca.key"
echo "lassen sich keine neuen Pi-Zertifikate mehr ausstellen."
