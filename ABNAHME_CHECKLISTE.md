# Abnahme-Checkliste KeyLessNetwork

Haken setzen (`[x]`), wenn der Punkt geprüft ist. Bisher hat das noch niemand getestet: Der Code wurde geschrieben, aber nicht auf echter Hardware oder in einem laufenden Supabase-Projekt ausprobiert.

Legende: **[Muss]** = vor Inbetriebnahme, **[Soll]** = vor Weitergabe an andere Nutzer, **[Kann]** = später.

---

## A. Projekt und Pakete

- [ ] **[Muss]** Im Ordner `Frontend`: `npm install` läuft ohne Fehler durch
- [ ] **[Muss]** `npx expo install --fix` meldet nichts mehr
- [ ] **[Muss]** `npx expo-doctor` meldet keine Fehler
- [ ] **[Muss]** `npx expo install expo-clipboard` ist ausgeführt (sonst bricht der Admin-Tab „Locker" ab)
- [ ] **[Muss]** `npx expo start --clear` startet ohne rote Fehler
- [ ] **[Soll]** Überflüssige Pakete geprüft: `expo-vector-icons` (alt) entfernen, `@react-navigation/*` nur behalten, wenn `expo-doctor` es verlangt
- [ ] **[Soll]** `npx tsc --noEmit` meldet keine Typfehler
- [ ] **[Soll]** `npm run lint` ohne Fehler

## B. Supabase

- [ ] **[Muss]** Authentication → Sign In / Providers: „Allow new users to sign up" AN, „Email" AN, „Confirm email" AUS
- [ ] **[Muss]** `Supabase/setup.sql` komplett einmal ausgeführt, ohne Fehlermeldung
- [ ] **[Muss]** Am Ende der Ausführung erscheint eine Tabelle mit mindestens einem offenen Einladungscode
- [ ] **[Muss]** Auf `auth.users` hängt nur der Trigger `kln_on_auth_user_created`:
  ```sql
  select t.tgname from pg_trigger t
  where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
  ```
- [ ] **[Muss]** Mindestens ein Admin existiert: `select * from public.kln_admins;` liefert eine Zeile
- [ ] **[Soll]** Für das Admin-Konto ist MFA aktiviert (Authentication → Multi-Factor)
- [ ] **[Soll]** Alte Klartext-Passwörter entfernt: `update public.codes set code2 = null where code2 is not null;`
- [ ] **[Soll]** In `Frontend/.env.local` steht nur die URL und der **anon**-Key, kein `service_role`-Key
- [ ] **[Kann]** Alte Tabelle `raspberry_pis` gelöscht, wenn nichts mehr darauf zugreift

## C. Raspberry Pi / Backend

Gilt pro Pi. Für die Simulation am PC siehe Abschnitt G.

- [ ] **[Muss]** Neue `Backend/main.py` liegt auf dem Pi, die alte ist gesichert
- [ ] **[Muss]** Pakete vorhanden: `fastapi`, `uvicorn`
- [ ] **[Muss]** `python3 main.py init --supabase-url … --anon-key … --locks N` ausgeführt (`N` = Schlösser dieser Platine: große Platine 4, kleine Platine 2)
- [ ] **[Muss]** Es wurde der **anon**-Key benutzt, nicht der `service_role`-Key
- [ ] **[Muss]** Setup-Code kopiert, danach aus Terminal-Verlauf und Zwischenablage entfernt
- [ ] **[Muss]** `locker.json` liegt neben `main.py`, Rechte nur für den Benutzer (`ls -l` zeigt `-rw-------`)
- [ ] **[Muss]** Server startet: `uvicorn main:app --host 0.0.0.0 --port 8443`
- [ ] **[Muss]** Der Pi hat Internet (er fragt bei Supabase die Freigaben ab)
- [ ] **[Muss]** Die Uhr des Pi ist korrekt (NTP aktiv: `timedatectl`), Abweichung zum Handy unter 30 Sekunden
- [ ] **[Muss]** Pins stimmen mit der Verdrahtung überein (BCM, siehe Kommentar in `main.py`): Schloss 1 = 17/15, 2 = 27/23, 3 = 12/16 (phys. 32/36), 4 = 20/21 (phys. 38/40)
- [ ] **[Muss]** Motor läuft beim Öffnen in die richtige Richtung (sonst `in1`/`in2` tauschen)
- [ ] **[Muss]** LED-Animation und Statusfarbe (grün offen, rot zu) funktionieren
- [ ] **[Soll]** Server startet nach einem Neustart automatisch (systemd-Dienst oder Autostart)
- [ ] **[Soll]** `locker.json` ist gesichert (ohne sie ist die Locker-ID weg)
- [ ] **[Kann]** TLS aktiviert (`KLN_TLS_CERT`, `KLN_TLS_KEY`) und in der App „HTTPS" gesetzt

## D. Registrierung und Login

- [ ] **[Muss]** Registrierung mit gültigem Einladungscode klappt, danach Weiterleitung zum Login
- [ ] **[Muss]** Der erste registrierte Nutzer ist automatisch Admin
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
- [ ] **[Soll]** Der Button „Test Login" auf der Startseite ist entfernt (er öffnet die App ohne Anmeldung)

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
  Im Admin-Tab beide mit IP `localhost` und den Ports 8443 und 8444 anlegen.

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
- [ ] **[Muss]** `locker.json`, `keys.json` und `.env.local` sind nicht in Git (`git status` zeigt sie nicht an)
- [ ] **[Muss]** Der `service_role`-Key steht nirgends im Projekt, im Chat oder auf dem Pi
- [ ] **[Soll]** Setup-Codes wurden nirgends gespeichert (kein Chat, keine Notiz)
- [ ] **[Soll]** Schlüsselhaltung geklärt: Wer Zugriff auf `locker.json` auf dem Pi oder auf das Supabase-Admin-Konto hat, hat Zugriff auf alle Locker
- [ ] **[Kann]** Einladungscodes sind zufällig (Knopf „Zufälligen Code erzeugen") statt erratbar wie `ADMIN001`

## I. Veröffentlichung (App-Build)

- [ ] **[Soll]** iOS: `NSLocalNetworkUsageDescription` und `NSAllowsLocalNetworking` stehen in `app.json` (sind eingetragen), im Build kommt die Abfrage „Lokales Netzwerk erlauben"
- [ ] **[Soll]** Android: unverschlüsseltes HTTP ist in Release-Builds blockiert. Entweder Pi mit TLS betreiben oder `expo-build-properties` mit `usesCleartextTraffic: true` einbauen
- [ ] **[Soll]** Selbstsignierte Zertifikate lehnt das Handy ab: bei TLS ein Zertifikat nutzen, dem das Handy vertraut
- [ ] **[Soll]** Testbuild auf echtem iOS- und Android-Gerät geprüft, nicht nur in Expo Go
- [ ] **[Kann]** App-Name, Icon, Bundle-ID und `scheme` (steht noch auf `expo-starter`) angepasst

## J. Doku und Aufräumen

- [ ] **[Soll]** Es gibt eine README, die das neue System beschreibt (Anmeldung über Supabase Auth, Tabellen `kln_*`, `Backend/main.py`). Die frühere `docs/README.md` ist nicht mehr im Projekt und beschrieb noch den alten Login
- [ ] **[Soll]** `Backend/FRONTEND_CHANGES.md` stimmt mit dem Verhalten überein
- [ ] **[Kann]** Ungenutzte Dateien entfernt: `src/components/PiForm.tsx`, `src/store/userStore.ts`, Ordner `.expo-test-export`
- [ ] **[Kann]** Lizenz und Credits laut `features.md` im Store-Eintrag vermerkt

---

## K. TLS/HTTPS am Pi einrichten

Der Pi-Server unterstützt TLS bereits über zwei Umgebungsvariablen (`Backend/main.py`, letzter Block): wenn `KLN_TLS_CERT` und `KLN_TLS_KEY` gesetzt sind, startet Uvicorn mit HTTPS, sonst mit HTTP und einem Warnhinweis. Es fehlte bisher nur die Anleitung, woher das Zertifikat kommt:

1. **Eigene CA fürs Heimnetz (empfohlen, kostenlos, kein Internet-Zugriff auf den Pi nötig):**
   - `mkcert` installieren (auf dem PC, nicht dem Pi): https://github.com/FiloSottile/mkcert
   - `mkcert -install` — installiert eine lokale Root-CA im PC-Zertifikatsspeicher
   - `mkcert <pi-hostname>.local <pi-ip>` — erzeugt `cert.pem` + `key.pem` für genau diese Pi-Adresse
   - Beide Dateien auf den Pi kopieren (z. B. nach `/home/pi/certs/`), dort NICHT ins Git-Repo legen
   - Start: `KLN_TLS_CERT=/home/pi/certs/cert.pem KLN_TLS_KEY=/home/pi/certs/key.pem python main.py`
   - Der Haken: das Handy muss der mkcert-Root-CA vertrauen, sonst lehnt es das Zertifikat ab (siehe Abschnitt I). Dazu `rootCA.pem` (liegt nach `mkcert -install` unter `mkcert -CAROOT`) per AirDrop/Mail aufs Handy schicken und als vertrauenswürdiges Zertifikat installieren (iOS: Einstellungen > Allgemein > VPN & Geräteverwaltung, danach zusätzlich unter Einstellungen > Allgemein > Info > Zertifikatsvertrauenseinstellungen aktivieren; Android: Einstellungen > Sicherheit > Verschlüsselung & Anmeldedaten > Zertifikat installieren).
2. **Let's Encrypt (nur sinnvoll, wenn der Pi über eine echte, öffentlich erreichbare Domain läuft, z. B. per DynDNS + Portfreigabe):** `certbot` mit DNS- oder HTTP-Challenge, danach `fullchain.pem`/`privkey.pem` wie oben einbinden. Für ein reines Heimnetz ohne öffentliche Domain ist Variante 1 einfacher und sicherer (keine offene Portfreigabe nötig).
3. **Rein selbstsigniert ohne CA** funktioniert technisch (`openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 825 -nodes`), aber Handys lehnen das ohne manuelles Ausnahme-Zulassen ab — für den Dauerbetrieb nicht empfehlenswert, nur zum schnellen Testen.
- [ ] **[Soll]** Zertifikat erzeugt und auf dem Pi hinterlegt (nicht im Git-Repo)
- [ ] **[Soll]** Pi startet mit `KLN_TLS_CERT`/`KLN_TLS_KEY` und zeigt keinen „ohne TLS"-Hinweis mehr
- [ ] **[Soll]** Handy vertraut dem Zertifikat (eigene CA installiert oder echte CA verwendet), `https://` in den Locker-Verbindungsdaten eingetragen (Spalte `https` in `kln_lockers`)

## L. Review der Mitarbeiter-Korrektur (alte Version) — Status

Ein Kollege hatte eine ÄLTERE Version des Projekts (Stand: Klartext-Login über `codes`-Tabelle, Server ohne jede Authentifizierung) mit Kommentaren durchgesehen (`server.py`, `create_tables.sql`, `docs/README.md`, plus `exploit-demo.sh` als Beweis). Abgleich mit dem aktuellen Stand:

| Punkt des Reviews | Betrifft alte Version | Aktueller Stand |
|---|---|---|
| Server ohne Authentifizierung, jeder öffnet per `curl` | `server.py` | ✅ behoben — HMAC-Signatur + Supabase-Login-Token, siehe Abschnitt oben |
| Passwort im Klartext in `code2` | `create_tables.sql` | ✅ behoben — echte Supabase Auth (gehashte Passwörter, Supabase übernimmt das) |
| RLS-Policies mit `USING (true)` — jeder anonyme Client darf alles lesen/ändern | `create_tables.sql` | ✅ behoben — Policies binden an `auth.uid()` / `kln_is_admin()` / `kln_can_access()` |
| Anon-Key + Daten im mitcommitteten Web-Build geleakt | `Frontend/.expo-test-export/` | ✅ jetzt behoben — Ordner aus Git-Tracking entfernt (`git rm -r --cached`) und in `.gitignore` aufgenommen. **Wichtig:** falls das Repo schon auf GitHub gepusht wurde, steht der alte Build in der Historie weiter drin. Für ein öffentliches Repo: `git log --all --oneline -- Frontend/.expo-test-export` prüfen und bei Bedarf mit `git filter-repo` aus der Historie entfernen, oder Repo neu aufsetzen |
| Kein `GPIO.cleanup()` / Shutdown-Handler, Pins bleiben bei Prozessende undefiniert | `server.py` | ✅ jetzt behoben — `atexit`/`SIGTERM`/`SIGINT`-Handler in `Backend/main.py` fahren die Motoren runter und rufen `GPIO.cleanup()` |
| Keine `requirements.txt`, keine Start-Doku | `server.py` | ✅ jetzt behoben — `Backend/requirements.txt` ergänzt |
| Motor-Zustand nur im RAM, nach Neustart „zu" unabhängig vom echten Zustand | `server.py` | ⚠️ weiterhin so (siehe „Bekannte Einschränkungen" unten) — bewusst nicht behoben, da ohne Endschalter am Motor nicht zuverlässig lösbar; nach jedem Neustart den physischen Zustand einmal prüfen |
| Race Condition bei `stop_animation`/`animation_thread` ohne eigenes Lock, blockierender `time.sleep()` im Request-Handler | `server.py` | ⚠️ im aktuellen `main.py` durch `motor_lock` um den ganzen Request entschärft (keine zwei Anfragen gleichzeitig pro Motor), `MOTOR_RUN_SECONDS` ist mit 0.1s sehr kurz gewählt — für echte Nebenläufigkeit mehrerer *verschiedener* Locker gleichzeitig wäre ein Lock pro Locker statt ein globaler `motor_lock` sauberer, aktuell aber unkritisch, da ein Pi ohnehin nur seine eigenen Locker bedient |
| Doku driftet vom Code ab (`docs/README.md` beschrieb nicht existierende Dateien) | `docs/README.md` | ✅ überholt — diese Datei existiert im aktuellen Projekt nicht mehr, Doku liegt jetzt aktuell in `Backend/FRONTEND_CHANGES.md` und dieser Checkliste |

**Exploit-Test (`exploit-demo.sh`):** Das Skript liest mit dem öffentlichen `anon`-Key ohne Login die `codes`-Tabelle aus (`GET /rest/v1/codes?select=username,code2,Role,genutzt`) und nutzte dafür die alte `USING (true)`-Policy. Ein Testlauf von hier aus war nicht möglich — der Netzwerkzugriff auf `*.supabase.co` ist sowohl in der Cloud-Sandbox als auch im Gerätezugriff durch das Konto-Whitelisting blockiert (bewusste Absicherung, kein Fehler). Zur eigenen Verifizierung in PowerShell/Terminal (rein lesend, ungefährlich):
```
curl.exe "https://uyjzgvlrwljermckrkbm.supabase.co/rest/v1/codes?select=username,code2,genutzt" -H "apikey: <DEIN ANON KEY>" -H "Authorization: Bearer <DEIN ANON KEY>"
```
Erwartetes Ergebnis NACH `Supabase/setup.sql`: ein Rechtefehler oder eine leere Liste, NICHT die Zeilen der `codes`-Tabelle. Falls doch Daten zurückkommen: `Supabase/setup.sql` wurde noch nicht (vollständig) ausgeführt — im SQL-Editor erneut laufen lassen, dann denselben Befehl wiederholen.
- [ ] **[Muss]** Obigen `curl`-Befehl selbst ausgeführt: Ergebnis ist ein Rechtefehler oder `[]`, keine Nutzerdaten

## Bekannte Einschränkungen

- Der Pi braucht Internet. Fällt Supabase aus, öffnet er nichts (bewusst sicher).
- Die Verbindung zum Pi läuft ohne TLS, solange kein Zertifikat eingerichtet ist (siehe Abschnitt K). Der Lockerschlüssel wird nie übertragen, ein Mitleser im WLAN sieht aber, dass geöffnet wurde.
- Schloss-Zustände (offen/zu) merkt sich der Pi nur im Arbeitsspeicher. Nach einem Neustart stehen alle Schlösser auf „zu", auch wenn sie physisch offen sind.
- Es gibt keine Passwort-Zurücksetzen-Funktion. Ein vergessenes Passwort kann nur ein Admin durch Löschen des Nutzers und neue Registrierung beheben.
