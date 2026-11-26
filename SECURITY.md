# Sicherheit: Wo Geheimnisse liegen und wie das System geschützt ist

## Geheimnisse gehören in einen Passwortmanager, nicht ins Repo

Nichts aus dieser Liste wird committet, in Doku-Dateien geschrieben oder in Chats kopiert.
Ablage: ein Passwortmanager (z. B. Bitwarden oder KeePassXC) bzw. für Dateien ein verschlüsseltes Backup.

| Geheimnis | Wo es liegt | Wer es braucht |
|---|---|---|
| Supabase-Konto (Dashboard-Login, MFA aktiv) | Passwortmanager | Admin |
| `service_role`-Key | nur im Supabase-Dashboard, **nirgends sonst** | niemand (wird nicht benutzt) |
| anon-Key | `Frontend/.env.local` und `locker.json` auf dem Pi | App und Pi (ist öffentlich gedacht, Schutz macht RLS) |
| `locker.json` (Locker-ID + Lockerschlüssel) | nur auf dem jeweiligen Pi, Rechte `600`, Backup verschlüsselt | Pi |
| Setup-Code `KLN1-…` | nirgends speichern, nach Eingabe im Admin-Tab aus Terminal-Verlauf löschen | Admin, einmalig |
| privater CA-Schlüssel `~/kln-ca/kln-ca.key` | PC des Admins + verschlüsseltes Backup, **nie** auf einem Pi | Admin (neue Pi-Zertifikate) |
| `certs/server.key` des Pi | nur auf dem jeweiligen Pi, Rechte `600` | Pi |
| App-Passwörter der Nutzer | gehasht bei Supabase Auth, niemand kennt sie | Nutzer selbst |

Öffentlich und damit unkritisch: `Frontend/certs/kln-ca.pem` (CA-Zertifikat ohne Schlüssel).

Wurde ein Geheimnis doch einmal committet, reicht Löschen nicht: Es steckt weiter in der Git-Historie.
Dann den Schlüssel **rotieren** (anon-Key im Supabase-Dashboard, Lockerschlüssel mit `python main.py rotate`)
und die Datei zusätzlich aus der Historie entfernen.

## Wie eine Anfrage an den Pi abgesichert ist

1. **TLS** (Pflicht): Die Verbindung App ↔ Pi ist verschlüsselt. Der Pi lehnt unverschlüsseltes HTTP mit `426` ab.
2. **HMAC-Signatur** mit dem Lockerschlüssel über Methode, Pfad, Zeitstempel, Nonce und Body-Hash.
   Zeitstempel max. 30 s alt, jede Nonce nur einmal (Replay-Schutz). Auch die Antwort des Pi ist signiert.
3. **Login-Token**: Der Pi fragt mit dem Supabase-Token des Nutzers bei Supabase nach (`kln_can_access`),
   ob dieser Nutzer den Locker öffnen darf. Erst danach bewegt sich ein Motor.

### Warum TLS Pflicht ist

Ohne TLS sieht jeder im selben WLAN das Login-Token im Klartext. Mit diesem Token (ca. 1 Stunde gültig)
und dem öffentlichen anon-Key kann er bei Supabase `kln_locker_secrets` lesen, also den Lockerschlüssel
abholen und damit beliebige gültige Öffnen-Befehle signieren. Gehört das Token einem Admin, kann er sich
per `kln_set_admin` sogar dauerhaft selbst zum Admin machen. Die Signatur allein schützt also nicht.

### Der Lockerschlüssel ist geteilt

Jedes freigegebene Mitglied bekommt nach dem Login denselben Lockerschlüssel (nur im Arbeitsspeicher).
Die eigentliche Rechteprüfung ist deshalb Schritt 3 (Token-Abfrage bei Supabase), nicht die Signatur.
Wird eine Freigabe entzogen, wirkt das nach spätestens 60 s, der Schlüssel bleibt aber derselbe. Wer
befürchtet, dass ein ehemaliges Mitglied den Schlüssel kopiert hat, erneuert ihn: `python main.py rotate`
auf dem Pi und den neuen Setup-Code im Admin-Tab eingeben. Ohne gültiges Token nützt der Schlüssel allein nichts.

### Sitzung auf dem Handy

Die Supabase-Sitzung (inkl. Refresh-Token) liegt verschlüsselt im iOS-Schlüsselbund bzw. Android Keystore
(`expo-secure-store`, siehe `Frontend/src/lib/secure-storage.ts`). Nur in der Web-Version zum Testen am PC
bleibt sie im `localStorage` des Browsers.

## Sicherheitslücke gefunden?

Bitte nicht als öffentliches GitHub-Issue melden, sondern direkt an den Projektverantwortlichen (Leon Ayvazian).
