# certs

`kln-ca.pem` ist das **öffentliche** Zertifikat der MakerLab-CA. Die Android-App baut es ein und
vertraut damit den TLS-Zertifikaten der Pis (siehe `plugins/withKlnCa.js`).

Erzeugt wird es mit `bash Backend/deploy/make-certs.sh <IP des Pi>`. Die Datei darf ins Repo,
der private Schlüssel `kln-ca.key` **niemals** (er bleibt in `~/kln-ca/` auf dem PC des Admins).
