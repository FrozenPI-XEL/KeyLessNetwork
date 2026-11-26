# Abnahme-Checkliste KeyLessNetwork

Haken setzen (`[x]`), wenn der Punkt geprüft ist. Bisher hat das noch niemand getestet: Der Code wurde geschrieben, aber nicht auf echter Hardware oder in einem laufenden Supabase-Projekt ausprobiert.

Legende: **[Muss]** = vor Inbetriebnahme, **[Soll]** = vor Weitergabe an andere Nutzer, **[Kann]** = später.

---

## A. Projekt und Pakete

- [x] **[Muss]** Im Ordner `Frontend`: `npm install` läuft ohne Fehler durch
- [ ] **[Muss]** `npx expo install --fix` meldet nichts mehr
- [ ] **[Muss]** `npx expo-doctor` meldet keine Fehler
- [x] **[Muss]** `expo-clipboard` steht in `package.json` (sonst bricht der Admin-Tab „Locker" ab)
- [ ] **[Muss]** `npx expo start --clear` startet ohne rote Fehler
- [x] **[Soll]** Überflüssige Pakete geprüft und aus `package.json` entfernt (nur Pakete, die nirgends importiert werden und von keinem anderen Paket gebraucht werden): `expo-vector-icons` (alt; genutzt wird `@expo/vector-icons`, das bleibt), `@react-navigation/*` (bringt `expo-router` selbst mit), `framer-motion`, `lucide-react-native`, `react-native-svg`, `uuid`, `react-native-get-random-values`, `simple-swizzle`, `clsx`, `tailwind-merge`, `expo-notifications`, `react-native-modal-datetime-picker`, `@react-native-community/datetimepicker`. Danach einmal `npm install` unter Windows, damit `package-lock.json` und `node_modules` nachziehen
- [x] **[Soll]** `npx tsc --noEmit` meldet keine Typfehler
- [x] **[Soll]** `npm run lint` ohne Fehler (alle echten Fehler behoben; bitte einmal unter Windows bestätigen, in der Linux-Testumgebung fehlte nur eine native Datei für die Import-Prüfung)
- [ ] **[Muss]** Nach dem Entfernen von NativeWind einmal `npm install` unter Windows, damit `node_modules` zur `package-lock.json` passt
- [ ] **[Soll]** `npx expo install expo-system-ui` (sonst greift `userInterfaceStyle: "dark"` aus `app.json` unter Android nicht)
- [ ] **[Soll]** GitHub-Actions-Lauf (`CI`) ist grün: TypeScript, Lint, Backend-Tests, SQL-Tests

## B. Supabase

- [ ] **[Muss]** Authentication → Sign In / Providers: „Allow new users to sign up" AN, „Email" AN, „Confirm email" AUS
- [ ] **[Muss]** Authentication → Passwort-Einstellungen: „Minimum password length" auf **10** (gleiche Regel wie in der App, aber serverseitig)
- [ ] **[Muss]** `Supabase/setup.sql` komplett ausgeführt, ohne Fehlermeldung (die einzige SQL-Datei; ersetzt `create_tables.sql` und `security_setup.sql`, darf mehrfach laufen)
- [ ] **[Muss]** Am Ende der Ausführung erscheint eine Tabelle mit mindestens einem offenen Einladungscode
- [ ] **[Muss]** Auf `auth.users` hängt nur der Trigger `kln_on_auth_user_created`:
  ```sql
  select t.tgname from pg_trigger t
  where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
  ```
- [ ] **[Muss]** Mindestens ein Admin existiert: `select * from public.kln_admins;` liefert eine Zeile
- [ ] **[Muss]** Automatische Admin-Vergabe ist verbraucht: `select admin_bootstrapped from public.kln_settings;` ergibt `true`
- [ ] **[Muss]** Danach anon-Key rotieren (Project Settings → API → JWT-Keys/API-Keys) und überall eintragen: `Frontend/.env.local` und `locker.json` auf jedem Pi (`supabase_anon_key`). Der alte Key steckt noch in der Git-Historie (`.expo-test-export/`)
- [ ] **[Soll]** Für das Admin-Konto ist MFA aktiviert (Authentication → Multi-Factor)
- [ ] **[Soll]** Alte Klartext-Passwörter entfernt (macht `setup.sql` jetzt automatisch). Prüfen: `select count(*) from public.codes where code2 is not null;` ergibt 0 (Fehler „column does not exist" ist auch in Ordnung)
- [x] **[Soll]** In `Frontend/.env.local` steht nur die URL und der **anon**-Key, kein `service_role`-Key
- [ ] **[Kann]** Alte Tabelle `raspberry_pis` gelöscht, wenn nichts mehr darauf zugreift

## C. Raspberry Pi / Backend

Gilt pro Pi. Für die Simulation am PC siehe Abschnitt G.

- [ ] **[Muss]** Neue `Backend/main.py` liegt auf dem Pi, die alte ist gesichert
- [ ] **[Muss]** Pakete vorhanden: `fastapi`, `uvicorn`
- [ ] **[Muss]** `python3 main.py init --supabase-url … --anon-key … --locks N` ausgeführt (`N` = Schlösser dieser Platine: große Platine 4, kleine Platine 2)
- [ ] **[Muss]** Es wurde der **anon**-Key benutzt, nicht der `service_role`-Key
- [ ] **[Muss]** Setup-Code kopiert, danach aus Terminal-Verlauf und Zwischenablage entfernt
- [ ] **[Muss]** `locker.json` liegt neben `main.py`, Rechte nur für den Benutzer (`ls -l` zeigt `-rw-------`)
- [ ] **[Muss]** TLS-Zertifikat liegt in `/home/pi/projects/certs/server.crt` und `server.key` (Abschnitt K)
- [ ] **[Muss]** Server startet mit TLS: `python3 main.py` (oder `uvicorn main:app --host 0.0.0.0 --port 8443 --ssl-certfile certs/server.crt --ssl-keyfile certs/server.key`). Ohne Zertifikat bricht der Start mit Hinweis ab
- [ ] **[Muss]** `curl -k http://<pi-ip>:8443/health` liefert Fehler (kein HTTP), `curl --cacert kln-ca.crt https://<pi-ip>:8443/health` liefert `401` (Anfrage kommt an, ist aber nicht signiert)
- [ ] **[Muss]** Der Pi hat Internet (er fragt bei Supabase die Freigaben ab)
- [ ] **[Muss]** Die Uhr des Pi ist korrekt (NTP aktiv: `timedatectl`), Abweichung zum Handy unter 30 Sekunden
- [ ] **[Muss]** Pins stimmen mit der Verdrahtung überein (BCM, siehe Kommentar in `main.py`): Schloss 1 = 17/15, 2 = 27/23, 3 = 12/16 (phys. 32/36), 4 = 20/21 (phys. 38/40)
- [ ] **[Muss]** Motor läuft beim Öffnen in die richtige Richtung (sonst `in1`/`in2` tauschen)
- [ ] **[Muss]** Motorlaufzeit passt: Standard sind 0,1 s (früher 2 s). Schloss öffnet und schließt vollständig? Sonst in `/home/pi/projects/kln.env` z. B. `KLN_MOTOR_SECONDS=2` setzen und Dienst neu starten
- [ ] **[Muss]** LED-Animation und Statusfarbe (grün offen, rot zu) funktionieren
- [ ] **[Soll]** Server startet nach einem Neustart automatisch: `Backend/deploy/` nach `/home/pi/projects/deploy/` kopieren, dann `bash deploy/install-service.sh`. Prüfen mit `sudo reboot`, danach `systemctl status keylessnetwork`
- [ ] **[Soll]** `locker.json` ist gesichert (ohne sie ist die Locker-ID weg)
- [ ] **[Muss]** TLS aktiviert und im Admin-Tab beim Locker „HTTPS" gesetzt (Abschnitt K)

## D. Registrierung und Login

- [ ] **[Muss]** Registrierung mit gültigem Einladungscode klappt, danach Weiterleitung zum Login
- [ ] **[Muss]** Der erste registrierte Nutzer ist automatisch Admin, alle weiteren nicht (auch dann nicht, wenn alle Admins gelöscht wurden)
- [ ] **[Muss]** Passwort mit weniger als 10 Zeichen wird abgelehnt, längere Passwörter (z. B. 20 Zeichen) funktionieren
- [ ] **[Muss]** Login mit Benutzername und Passwort klappt, danach erscheint die Startseite
- [ ] **[Muss]** Falsches Passwort: Meldung „Benutzername oder Passwort falsch!"
- [ ] **[Muss]** Gleicher Code ein zweites Mal: Registrierung wird abgelehnt
- [ ] **[Muss]** Ungültiger Code: Meldung „Code ungültig oder bereits verwendet!"
- [ ] **[Muss]** Gleicher Benutzername zweimal: Meldung „schon vergeben" (auch bei anderer Groß-/Kleinschreibung)
- [ ] **[Soll]** Benutzername mit Umlaut oder Leerzeichen funktioniert
- [ ] **[Soll]** Benutzername länger als 24 Zeichen wird abgelehnt
- [ ] **[Muss]** App schließen und neu öffnen: man bleibt eingeloggt
- [ ] **[Muss]** Ausloggen im Tab „Mein Account": man landet wieder auf der Startseite, „Steuerung" zeigt nichts mehr
- [ ] **[Muss]** Tab „Mein Account" zeigt Benutzername und Rolle, **kein** Passwort
- [x] **[Soll]** Der Button „Test Login" auf der Startseite ist entfernt (er öffnet die App ohne Anmeldung)

## E. Admin-Tab

Nur als Admin eingeloggt.

- [ ] **[Muss]** Tab „Admin" ist sichtbar, bei einem normalen Nutzer **nicht**
- [ ] **[Muss]** Reiter **Nutzer:** Liste zeigt alle Nutzer, Admin-Rolle vergeben und entziehen, Nutzer löschen
- [ ] **[Muss]** Man kann sich selbst weder löschen noch die eigene Admin-Rolle entziehen
- [ ] **[Muss]** Reiter **Codes:** Zufälligen Code erzeugen, eigenen Code (8 Zeichen) anlegen, Code löschen
- [ ] **[Muss]** Reiter **Locker:** „Aus Zwischenablage einfügen" holt den Setup-Code, unter dem Feld steht „✓ Code erkannt"
- [ ] **[Muss]** Locker speichern klappt und erscheint in der Liste
- [ ] **[Muss]** Zugriff (Personen-Symbol): Nutzer freigeben und entziehen
- [ ] **[Muss]** Locker löschen entfernt Schlüssel und Freigaben
- [ ] **[Soll]** Tastatur verdeckt keine Eingabefelder, Antippen von Knöpfen klappt auch mit offener Tastatur
- [ ] **[Soll]** Ungültiger Setup-Code (zu kurz) wird abgelehnt, ebenso leerer Name und ungültiger Port

## F. Steuerung (normaler Nutzer)

Mit einem zweiten Konto ohne Admin-Rolle testen.

- [ ] **[Muss]** Ohne Freigabe: Liste leer, Hinweis „Frag einen Admin"
- [ ] **[Muss]** Nach Freigabe (Liste nach unten ziehen zum Aktualisieren): Locker erscheint
- [ ] **[Muss]** Suche filtert nach Name und Adresse
- [ ] **[Muss]** Antippen öffnet die Control-Ansicht, Status zeigt „Online"
- [ ] **[Muss]** „Auf" und „Zu" bewegen das richtige Schloss
- [ ] **[Muss]** Es werden genau so viele Schlösser angezeigt, wie die Platine hat (kleine Platine: 2)
- [ ] **[Muss]** Knöpfe lassen sich nicht spammen: alle sind während der Aktion und eine Sekunde danach gesperrt
- [ ] **[Muss]** „Auf" bei bereits offenem Schloss zeigt einen Hinweis, kein Absturz
- [ ] **[Muss]** Pi aus oder nicht erreichbar: Meldung statt Absturz
- [ ] **[Muss]** Freigabe entzogen, Control-Ansicht bleibt offen: nach dem ersten `401` hört die App auf zu pingen („Verbindung pausiert“), es kommt **keine** 5-Minuten-Sperre
- [ ] **[Soll]** „‹ Alle Locker" führt zurück zur Liste
- [ ] **[Soll]** Der Nutzer sieht nirgends einen Schlüssel oder eine Eingabe von Keys

## G. Mehrere Locker

- [ ] **[Muss]** Zweiten Pi einrichten: auf **jedem** Pi läuft `init` einzeln, jeder bekommt seine eigene Locker-ID. `locker.json` darf nie von einem Pi auf einen anderen kopiert werden
- [ ] **[Muss]** Beide Locker im Admin-Tab einzeln angelegt (je eigener Setup-Code, eigene IP)
- [ ] **[Muss]** Admin sieht beide in der Liste, ein Nutzer sieht nur die für ihn freigegebenen
- [ ] **[Muss]** Locker A freigegeben, Locker B nicht: Nutzer sieht nur A, Zugriff auf B nicht möglich
- [ ] **[Muss]** Steuerung von A beeinflusst B nicht
- [ ] **[Muss]** Locker mit 2 und Locker mit 4 Schlössern zeigen in der App jeweils die richtige Anzahl
- [ ] **[Soll]** Suche findet den richtigen Locker, wenn beide ähnliche Namen haben
- [ ] **[Kann]** Test am PC ohne zweiten Pi, in zwei Terminals im Ordner `Backend`:
  ```
  # Terminal 1 (Locker 1)
  python main.py init --supabase-url … --anon-key … --locks 4
  python -m uvicorn main:app --port 8443

  # Terminal 2 (Locker 2)
  $env:KLN_CONFIG_FILE="locker2.json"
  python main.py init --supabase-url … --anon-key … --locks 2
  python -m uvicorn main:app --port 8444
  ```
  Im Admin-Tab beide mit IP `localhost` und den Ports 8443 und 8444 anlegen, „HTTPS" aus.
  Unter Windows (Simulation) erlaubt der Server unverschlüsseltes HTTP automatisch, die App nur in Entwicklungs-Builds (`npx expo start`).

## H. Sicherheit (Negativtests)

- [ ] **[Muss]** Entzogene Freigabe: Nutzer kann nach spätestens einer Minute nicht mehr öffnen
- [ ] **[Muss]** Nach `python main.py rotate` mit altem Schlüssel in der App: Zugriff scheitert (401), nach neuem Setup-Code im Admin-Tab klappt es wieder
- [ ] **[Muss]** Handy-Uhr um mehrere Minuten verstellt: Zugriff scheitert mit klarer Meldung zur Uhrzeit
- [ ] **[Muss]** Fünf Fehlversuche hintereinander: der Pi sperrt die Adresse (429), nach 5 Minuten geht es wieder
- [ ] **[Muss]** Ohne Login darf der Anon-Key keine Schlüssel und keine Codes lesen. Jeweils muss `[]` oder ein Rechtefehler kommen:
  ```
  curl.exe "https://DEIN-PROJEKT.supabase.co/rest/v1/kln_locker_secrets?select=*" -H "apikey: ANON_KEY"
  curl.exe "https://DEIN-PROJEKT.supabase.co/rest/v1/codes?select=*" -H "apikey: ANON_KEY"
  ```
- [ ] **[Muss]** Ein normaler Nutzer kann keine Locker, Codes oder Freigaben anlegen oder ändern (Test in der App oder per REST)
- [ ] **[Muss]** Ein nicht freigegebener Nutzer bekommt vom Pi keinen Zugriff, auch wenn er die IP kennt
- [x] **[Muss]** `locker.json`, `keys.json` und `.env.local` sind nicht in Git (`git status` zeigt sie nicht an)
- [ ] **[Muss]** Der `service_role`-Key steht nirgends im Projekt, im Chat oder auf dem Pi (Projekt geprüft: alle Keys sind anon-Keys; Pi beim gemeinsamen Test prüfen)
- [ ] **[Soll]** Setup-Codes wurden nirgends gespeichert (kein Chat, keine Notiz)
- [ ] **[Soll]** Schlüsselhaltung geklärt: Wer Zugriff auf `locker.json` auf dem Pi oder auf das Supabase-Admin-Konto hat, hat Zugriff auf alle Locker
- [ ] **[Kann]** Einladungscodes sind zufällig (Knopf „Zufälligen Code erzeugen") statt erratbar wie `ADMIN001`

## I. Veröffentlichung (App-Build)

- [ ] **[Soll]** iOS: `NSLocalNetworkUsageDescription` und `NSAllowsLocalNetworking` stehen in `app.json` (sind eingetragen), im Build kommt die Abfrage „Lokales Netzwerk erlauben"
- [ ] **[Muss]** Android: `Frontend/certs/kln-ca.pem` ist committet (sonst bricht der Build mit Hinweis ab). Das Plugin `plugins/withKlnCa.js` baut die CA in die App ein, HTTP bleibt in Release-Builds verboten. Nach `npx expo prebuild` prüfen: `android/app/src/main/res/xml/network_security_config.xml` existiert
- [ ] **[Muss]** iOS: MakerLab-CA auf jedem iPhone installiert und voll vertraut (Abschnitt K)
- [ ] **[Soll]** Testbuild auf echtem iOS- und Android-Gerät geprüft, nicht nur in Expo Go
- [ ] **[Kann]** App-Name, Icon, Bundle-ID und `scheme` angepasst. Erledigt: Name `KeyLessNetwork`, Scheme `keylessnetwork`, iOS/Android `com.frozenpixel.keylessnetwork`. Offen: eigenes Icon

## J. Doku und Aufräumen

- [ ] **[Soll]** Es gibt eine README, die das neue System beschreibt (Anmeldung über Supabase Auth, Tabellen `kln_*`, `Backend/main.py`). Die frühere `docs/README.md` ist nicht mehr im Projekt und beschrieb noch den alten Login
- [x] **[Soll]** `SECURITY.md` beschreibt, wo welche Geheimnisse liegen (Passwortmanager, nie im Repo) und warum TLS Pflicht ist. Die frühere Notiz „wichtig für security.md“ ist ersetzt
- [x] **[Soll]** `CONTRIBUTING.md` beschreibt Branches, Pull Requests, Merge-Regel und Commit-Messages
- [ ] **[Soll]** Auf GitHub Branch-Schutz für `main` aktiviert (siehe `CONTRIBUTING.md`)
- [ ] **[Soll]** `Backend/FRONTEND_CHANGES.md` stimmt mit dem Verhalten überein
- [x] **[Kann]** Ungenutzte Dateien entfernt: `src/components/PiForm.tsx`, `src/store/userStore.ts`, `src/components/rollenauswahl.tsx`, `src/components/zeitauswahl.tsx`, Ordner `.expo-test-export`
- [ ] **[Kann]** Lizenz und Credits laut `features.md` im Store-Eintrag vermerkt

---

## K. TLS/HTTPS am Pi einrichten (Pflicht)

Ohne TLS kann jeder im WLAN das Login-Token mitlesen und damit bei Supabase den Lockerschlüssel abholen
(Details in `SECURITY.md`). Deshalb startet der Pi ohne Zertifikat nicht mehr, lehnt unverschlüsseltes HTTP
mit `426` ab, und die App spricht in Release-Builds nur noch HTTPS.

Gewählter Weg: **eigene MakerLab-CA**. Kostenlos, keine Domain und keine Portfreigabe nötig.

1. **Auf dem PC** (Git Bash): `bash Backend/deploy/make-certs.sh <IP des Pi> [hostname.local]`
   - erzeugt beim ersten Mal die CA in `~/kln-ca/` (privaten Schlüssel `kln-ca.key` sichern, nie aufs Pi, nie ins Repo)
   - erzeugt `~/kln-ca/<IP>/server.crt` und `server.key` für diesen Pi
   - legt `Frontend/certs/kln-ca.pem` an (öffentlich, wird committet)
2. **Auf den Pi kopieren:** `server.crt` und `server.key` nach `/home/pi/projects/certs/`, dann `chmod 600 /home/pi/projects/certs/server.key`
3. **Server neu starten:** `sudo systemctl restart keylessnetwork` (findet das Zertifikat automatisch)
4. **Android:** `Frontend/certs/kln-ca.pem` committen und die App neu bauen. Die App vertraut der CA dann von selbst
5. **iOS:** `~/kln-ca/kln-ca.crt` aufs iPhone schicken (AirDrop/Mail), Profil installieren
   (Einstellungen → Allgemein → VPN & Geräteverwaltung), danach unter Einstellungen → Allgemein → Info →
   Zertifikatsvertrauenseinstellungen „KeyLessNetwork MakerLab CA“ voll vertrauen
6. **Admin-Tab:** beim Locker „HTTPS" anhaken (ist jetzt Standard), Adresse genau so eintragen wie beim Zertifikat (IP)

Feste IP: Das Zertifikat gilt nur für die eingetragene IP bzw. den Namen. Im Router für jeden Pi eine feste IP vergeben.
Das Pi-Zertifikat läuft nach 825 Tagen ab (`openssl x509 -in server.crt -noout -enddate`), dann Schritt 1 und 2 wiederholen.

- [ ] **[Muss]** CA erzeugt, `kln-ca.key` gesichert (Passwortmanager/verschlüsselter Stick)
- [ ] **[Muss]** Zertifikat auf jedem Pi hinterlegt (nicht im Git-Repo), Pi startet ohne Fehlermeldung
- [ ] **[Muss]** Android- und iOS-Gerät verbinden sich per HTTPS, Status „Online"
- [ ] **[Muss]** Feste IP für jeden Pi im Router eingetragen

## L. Review der Mitarbeiter-Korrektur (alte Version) — Status

Ein Kollege hatte eine ÄLTERE Version des Projekts (Stand: Klartext-Login über `codes`-Tabelle, Server ohne jede Authentifizierung) mit Kommentaren durchgesehen (`server.py`, `create_tables.sql`, `docs/README.md`, plus `exploit-demo.sh` als Beweis). Abgleich mit dem aktuellen Stand:

| Punkt des Reviews | Betrifft alte Version | Aktueller Stand |
|---|---|---|
| Server ohne Authentifizierung, jeder öffnet per `curl` | `server.py` | ✅ behoben — HMAC-Signatur + Supabase-Login-Token, siehe Abschnitt oben |
| Passwort im Klartext in `code2` | `create_tables.sql` | ✅ behoben — echte Supabase Auth (gehashte Passwörter, Supabase übernimmt das) |
| RLS-Policies mit `USING (true)` — jeder anonyme Client darf alles lesen/ändern | `create_tables.sql` | ✅ behoben — Policies binden an `auth.uid()` / `kln_is_admin()` / `kln_can_access()` |
| Anon-Key + Daten im mitcommitteten Web-Build geleakt | `Frontend/.expo-test-export/` | ⚠️ Ordner wieder entfernt (kam durch den Merge `012a24d` zurück) und in `.gitignore`. Steckt aber wieder in der Historie (alte Commits doppelt). **Offen:** anon-Key rotieren (Abschnitt B) und Historie bereinigen + Force-Push |
| Kein `GPIO.cleanup()` / Shutdown-Handler, Pins bleiben bei Prozessende undefiniert | `server.py` | ✅ jetzt behoben — `atexit`/`SIGTERM`/`SIGINT`-Handler in `Backend/main.py` fahren die Motoren runter und rufen `GPIO.cleanup()` |
| Keine `requirements.txt`, keine Start-Doku | `server.py` | ✅ jetzt behoben — `Backend/requirements.txt` ergänzt |
| Motor-Zustand nur im RAM, nach Neustart „zu" unabhängig vom echten Zustand | `server.py` | ⚠️ weiterhin so (siehe „Bekannte Einschränkungen" unten) — bewusst nicht behoben, da ohne Endschalter am Motor nicht zuverlässig lösbar; nach jedem Neustart den physischen Zustand einmal prüfen |
| Race Condition bei `stop_animation`/`animation_thread` ohne eigenes Lock, blockierender `time.sleep()` im Request-Handler | `server.py` | ✅ behoben — jede LED-Animation hat ihr eigenes `threading.Event` (`LedAnimation` in `main.py`), `join()` mit Zeitlimit. Ein verlorenes Stop-Signal ist nicht mehr möglich, Test in `Backend/tests/test_main.py`. Motorlaufzeit über `KLN_MOTOR_SECONDS` einstellbar |
| Doku driftet vom Code ab (`docs/README.md` beschrieb nicht existierende Dateien) | `docs/README.md` | ✅ überholt — diese Datei existiert im aktuellen Projekt nicht mehr, Doku liegt jetzt aktuell in `Backend/FRONTEND_CHANGES.md` und dieser Checkliste |

**Exploit-Test (`exploit-demo.sh`):** Das Skript liest mit dem öffentlichen `anon`-Key ohne Login die `codes`-Tabelle aus (`GET /rest/v1/codes?select=username,code2,Role,genutzt`) und nutzte dafür die alte `USING (true)`-Policy. Ein Testlauf von hier aus war nicht möglich — der Netzwerkzugriff auf `*.supabase.co` ist sowohl in der Cloud-Sandbox als auch im Gerätezugriff durch das Konto-Whitelisting blockiert (bewusste Absicherung, kein Fehler). Zur eigenen Verifizierung in PowerShell/Terminal (rein lesend, ungefährlich):
```
curl.exe "https://uyjzgvlrwljermckrkbm.supabase.co/rest/v1/codes?select=username,code2,genutzt" -H "apikey: <DEIN ANON KEY>" -H "Authorization: Bearer <DEIN ANON KEY>"
```
Erwartetes Ergebnis NACH `Supabase/setup.sql`: ein Rechtefehler oder eine leere Liste, NICHT die Zeilen der `codes`-Tabelle. Falls doch Daten zurückkommen: `Supabase/setup.sql` wurde noch nicht (vollständig) ausgeführt — im SQL-Editor erneut laufen lassen, dann denselben Befehl wiederholen.
- [ ] **[Muss]** Obigen `curl`-Befehl selbst ausgeführt: Ergebnis ist ein Rechtefehler oder `[]`, keine Nutzerdaten

## Bekannte Einschränkungen

- Der Pi braucht Internet. Fällt Supabase aus, öffnet er nichts (bewusst sicher).
- Ohne TLS wäre die ganze Absicherung im WLAN abhörbar: Wer das Login-Token mitliest, kann damit bei Supabase den Lockerschlüssel abholen und beliebige Öffnen-Befehle signieren, mit einem Admin-Token sich sogar selbst zum Admin machen. Deshalb ist TLS Pflicht (Abschnitt K) und HTTP wird abgelehnt.
- Der Lockerschlüssel ist für alle Mitglieder eines Lockers gleich. Die Rechteprüfung macht Supabase anhand des Login-Tokens. Nach dem Entziehen einer Freigabe bei Verdacht `python main.py rotate` (siehe `SECURITY.md`).
- Schloss-Zustände (offen/zu) merkt sich der Pi nur im Arbeitsspeicher. Nach einem Neustart stehen alle Schlösser auf „zu", auch wenn sie physisch offen sind.
- Es gibt keine Passwort-Zurücksetzen-Funktion. Ein vergessenes Passwort kann nur ein Admin durch Löschen des Nutzers und neue Registrierung beheben.
