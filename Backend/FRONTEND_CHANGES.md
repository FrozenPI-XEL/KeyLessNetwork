# Backend-Änderungen und Frontend-Anpassungen

Neues Sicherheitsmodell: Nutzer loggen sich mit echter Supabase-Anmeldung ein und bekommen ihre Locker samt Schlüssel automatisch.
Eingegeben wird nur vom Admin, und nur einmal pro Locker.

## Wo liegt was

| Bereich | Dateien |
|---|---|
| Nutzer (Tab „Steuerung“) | `Frontend/src/app/(tabs)/control.tsx`, `Frontend/src/lib/kln-api.ts` |
| Admin (Tab „Admin“) | `Frontend/src/app/(tabs)/admin.tsx`, `Frontend/src/components/admin/` (`UsersTab`, `CodesTab`, `LockersTab`, `ui`) |
| Anmeldung | `login.tsx`, `register.tsx`, `profile-setup.tsx`, `store/authStore.ts`, `hooks/supabase-client.ts`, `lib/secure-storage.ts`, `app/_layout.tsx` |
| Eingabefeld | `Frontend/src/components/FloatingInput.tsx` (gemeinsam für Login, Registrierung, Profil-Setup) |
| Datenbank | `Supabase/setup.sql`, Typen dazu in `Frontend/src/types/database.ts` |
| Pi | `Backend/main.py`, Tests in `Backend/tests/` |
| TLS | `Backend/deploy/make-certs.sh`, `Frontend/plugins/withKlnCa.js`, `Frontend/certs/kln-ca.pem` |

## Ablauf

1. **Pi einrichten (einmalig, Admin im Terminal):** `python main.py init --supabase-url https://XXXX.supabase.co --anon-key <anon key>`. Das zeigt einen Setup-Code (`KLN1-…`, 96 Hex-Zeichen).
2. **Locker anlegen (Admin-Tab, „Locker“):** Name, IP, Port und Setup-Code eingeben. Der Schlüssel landet in Supabase.
3. **Nutzer freigeben (Admin-Tab, „Locker“):** Beim Locker auf das Personen-Symbol tippen und Nutzer freigeben.
4. **Nutzer registrieren sich selbst:** Admin erzeugt im Tab „Codes“ einen Einladungscode, der Nutzer registriert sich damit.
5. **Alle anderen Nutzer:** einloggen, Locker antippen, fertig. Die Schlüssel bleiben nur im Arbeitsspeicher und verschwinden beim Ausloggen.

## Anmeldung

Supabase Auth braucht eine E-Mail. Die App erzeugt sie intern aus dem Benutzernamen (`usernameToEmail` in `authStore.ts`). Sie wird nie angezeigt und es wird nie eine Mail verschickt. In Supabase muss dafür „Confirm email“ aus sein.
Die Registrierung prüft die Datenbank selbst (Trigger `kln_handle_new_user`): Ohne gültigen, unbenutzten Einladungscode entsteht kein Konto.
Passwort: mindestens 10 Zeichen (`MIN_PASSWORD_LENGTH` in `authStore.ts`, in Supabase dieselbe Mindestlänge einstellen).
Die Sitzung (inkl. Refresh-Token) liegt verschlüsselt im SecureStore (`lib/secure-storage.ts`), nur im Web in `localStorage`.
Der Supabase-Client ist typisiert (`createClient<Database>`). Nach Änderungen an `setup.sql` die Typen anpassen (`npm run gen:types`).

## Header bei jeder Anfrage an den Pi

| Header | Inhalt |
|---|---|
| `X-Locker-Id` | Locker-ID (UUID) |
| `X-Timestamp` | Unix-Zeit in Sekunden |
| `X-Nonce` | Zufälliger Hex-String, 32 Zeichen, bei jeder Anfrage neu |
| `X-Signature` | HMAC-SHA256 (Hex) mit dem Lockerschlüssel |
| `Authorization` | `Bearer <Supabase access_token>` |

Kanonischer String für die Signatur (Zeilen mit `\n`): `KLN1`, Methode, Pfad, Query, Timestamp, Nonce, SHA256(Body) als Hex.
Antwort des Pi: `X-Response-Signature` = HMAC über `KLN1-RESP`, Nonce der Anfrage, `X-Response-Timestamp`, HTTP-Status, SHA256 des rohen Bodys.

## Fehlercodes

| Code | Bedeutung |
|---|---|
| `401` | Signatur, Zeit, Locker-ID oder Freigabe falsch (absichtlich ohne Details) |
| `426` | Anfrage kam ohne TLS (HTTP statt HTTPS) |
| `429` | Zu viele Fehlversuche, IP 5 Minuten gesperrt |
| `503` | Pi nicht eingerichtet oder Supabase vom Pi aus nicht erreichbar |

## Regeln

- Nur HTTPS. Die App verweigert HTTP außer in Entwicklungs-Builds (`__DEV__`), der Pi antwortet auf HTTP mit `426`.
- Die Control-Ansicht pingt `/health` alle 10 s. Nach `401`, `426` oder `429` hört sie auf (sonst sperrt der Pi nach 5 Fehlversuchen) und zeigt „erneut versuchen“.
- Uhrzeit von Handy und Pi darf höchstens 30 Sekunden abweichen.
- Eine entzogene Freigabe wirkt am Pi nach spätestens 60 Sekunden.
- Schlüssel erneuern: `python main.py rotate` auf dem Pi, neuen Setup-Code im Admin-Tab beim selben Locker erneut eingeben.
- `locker.json` auf dem Pi niemals ins Repo (in die `.gitignore`).
