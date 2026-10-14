# Änderungen fürs Frontend

Das Backend (`backend/main.py`) wurde umgebaut. Das Frontend muss folgendes anpassen, sonst werden alle Anfragen mit `401` abgelehnt.

## 1. Neue Schlösser

Es gibt jetzt vier Schlösser: `lock_id` = `1`, `2`, `3`, `4`.

| Schloss | Physische Pins | BCM |
|---|---|---|
| 3 | 32 und 36 | 12 und 16 |
| 4 | 38 und 40 | 20 und 21 |

Die Endpunkte bleiben gleich:

- `GET  /health`
- `POST /lock/{id}/open`
- `POST /lock/{id}/close`
- `GET  /lock/{id}/status`

## 2. Verbindung nur noch über HTTPS

- Der Pi läuft auf **Port 8443** mit TLS.
- Empfohlen: **Zertifikat-Pinning** in der App (das Zertifikat bzw. dessen Public-Key-Hash fest in der App hinterlegen).

## 3. Jede Anfrage muss signiert sein

Pro Gerät gibt es einen geheimen 256-Bit-Schlüssel (64 Hex-Zeichen). Er wird auf dem Pi erzeugt mit:

```
python main.py genkey <geraete-id>
```

Den Schlüssel einmalig sicher in die App übertragen und dort im sicheren Speicher ablegen (iOS Keychain / Android Keystore), **nie** im Code oder in Logs.

### Header bei jeder Anfrage

| Header | Inhalt |
|---|---|
| `X-Device-Id` | Geräte-ID, wie bei `genkey` angegeben |
| `X-Timestamp` | Aktuelle Unix-Zeit in Sekunden |
| `X-Nonce` | Zufälliger Hex-String, 32 Zeichen, **bei jeder Anfrage neu** |
| `X-Signature` | HMAC-SHA256 als Hex (siehe unten) |

### Signatur berechnen

Kanonischer String, Zeilen mit `\n` getrennt (kein `\n` am Ende):

```
KLN1
<METHODE in Großbuchstaben>
<Pfad, z. B. /lock/3/open>
<Query ohne ?, leer wenn keine>
<X-Timestamp>
<X-Nonce>
<SHA256 des Bodys als Hex; bei leerem Body der SHA256 von "">
```

`X-Signature = HMAC_SHA256(schluessel_als_bytes, kanonischer_string)` als Hex, kleingeschrieben.

Wichtig: Der Schlüssel ist ein Hex-String und muss vor dem HMAC in **Bytes** umgewandelt werden.

Beispiel (JavaScript, `hmacSha256Hex`/`sha256Hex` stehen für die Crypto-Bibliothek der App):

```js
async function signedFetch(baseUrl, deviceId, keyHex, method, path, body = "") {
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = randomHex(16); // 16 Bytes -> 32 Hex-Zeichen, kryptografisch sicherer Zufall
  const canonical = ["KLN1", method, path, "", ts, nonce, sha256Hex(body)].join("\n");
  const signature = hmacSha256Hex(hexToBytes(keyHex), canonical);

  const res = await fetch(baseUrl + path, {
    method,
    body: body || undefined,
    headers: {
      "X-Device-Id": deviceId,
      "X-Timestamp": ts,
      "X-Nonce": nonce,
      "X-Signature": signature,
    },
  });
  return { res, nonce };
}
```

## 4. Antworten des Pi prüfen

Jede Antwort enthält zwei Header:

- `X-Response-Timestamp`
- `X-Response-Signature`

Prüfung in der App (Antwort verwerfen, wenn sie nicht stimmt):

```
KLN1-RESP
<Nonce der eigenen Anfrage>
<X-Response-Timestamp>
<HTTP-Statuscode>
<SHA256 des rohen Antwort-Bodys als Hex>
```

Erwartet: `HMAC_SHA256(schluessel_als_bytes, string)` als Hex, verglichen mit `X-Response-Signature`. Den Body dafür **als rohen Text** hashen, nicht neu serialisieren. Zusätzlich prüfen, dass `X-Response-Timestamp` nicht mehr als ca. 30 Sekunden von der Handyzeit abweicht.

Die Antwort-Bodys selbst (`success`, `lock`, `state`, `error`) bleiben unverändert.

## 5. Neue Fehlercodes

| Code | Bedeutung |
|---|---|
| `401` | Signatur, Zeitstempel, Nonce oder Geräte-ID falsch (absichtlich keine Details) |
| `429` | Zu viele Fehlversuche, IP für 5 Minuten gesperrt |

## 6. Wichtige Regeln

- Die Uhrzeit von Handy und Pi darf höchstens **30 Sekunden** abweichen. Am Pi NTP aktiv lassen, in der App notfalls bei `401` eine Hinweismeldung zur Uhrzeit anzeigen.
- Nonce nie wiederverwenden, auch nicht bei einem Wiederholungsversuch. Jeder Retry bekommt eine neue Nonce und einen neuen Timestamp.
- Auch `/health` und `/status` müssen signiert werden.
- `keys.json` auf dem Pi gehört in die `.gitignore` und darf nie ins Repo.
