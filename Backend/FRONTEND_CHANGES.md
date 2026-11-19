# Backend-Änderungen und Frontend-Anpassungen

Neues Sicherheitsmodell: Nutzer loggen sich mit echter Supabase-Anmeldung ein und bekommen ihre Locker samt Schlüssel automatisch.
Eingegeben wird nur vom Admin, und nur einmal pro Locker.

## Wo liegt was

| Bereich | Dateien |
|---|---|
| Nutzer (Tab „Steuerung“) | `Frontend/src/app/(tabs)/controll.tsx`, `Frontend/src/lib/kln-api.ts` |
| Admin (Tab „Admin“) | `Frontend/src/app/(tabs)/admin.tsx`, `Frontend/src/components/admin/` (`UsersTab`, `CodesTab`, `LockersTab`, `ui`) |
| Anmeldung | `login.tsx`, `register.tsx`, `profile-setup.tsx`, `store/authStore.ts`, `hooks/supabase-client.ts`, `app/_layout.tsx` |
| Datenbank | `Supabase/security_setup.sql` |
| Pi | `Backend/main.py` |

## Ablauf

1. **Pi einrichten (einmalig, Admin im Terminal):** `python main.py init --supabase-url https://XXXX.supabase.co --anon-key <anon key>`. Das zeigt einen Setup-Code (`KLN1-…`, 96 Hex-Zeichen).
2. **Locker anlegen (Admin-Tab, „Locker“):** Name, IP, Port und Setup-Code eingeben. Der Schlüssel landet in Supabase.
3. **Nutzer freigeben (Admin-Tab, „Locker“):** Beim Locker auf das Personen-Symbol tippen und Nutzer freigeben.
4. **Nutzer registrieren sich selbst:** Admin erzeugt im Tab „Codes“ einen Einladungscode, der Nutzer registriert sich damit.
5. **Alle anderen Nutzer:** einloggen, Locker antippen, fertig. Die Schlüssel bleiben nur im Arbeitsspeicher und verschwinden beim Ausloggen.

## Anmeldung

Supabase Auth braucht eine E-Mail. Die App erzeugt sie intern aus dem Benutzernamen (`usernameToEmail` in `authStore.ts`). Sie wird nie angezeigt und es wird nie eine Mail verschickt. In Supabase muss dafür „Confirm email“ aus sein.
Die Registrierung prüft die Datenbank selbst (Trigger `kln_handle_new_user`): Ohne gültigen, unbenutzten Einladungscode entsteht kein Konto.

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
| `429` | Zu viele Fehlversuche, IP 5 Minuten gesperrt |
| `503` | Pi nicht eingerichtet oder Supabase vom Pi aus nicht erreichbar |

## Regeln

- Uhrzeit von Handy und Pi darf höchstens 30 Sekunden abweichen.
- Eine entzogene Freigabe wirkt am Pi nach spätestens 60 Sekunden.
- Schlüssel erneuern: `python main.py rotate` auf dem Pi, neuen Setup-Code im Admin-Tab beim selben Locker erneut eingeben.
- `locker.json` auf dem Pi niemals ins Repo (in die `.gitignore`).
- Der „Test Login“-Button auf der Startseite ist nur noch Optik: Ohne echte Sitzung zeigt „Steuerung“ nichts an. Vor einer Veröffentlichung entfernen.
