# Arbeitsablauf

`main` ist das, was ausgeliefert wird. Deshalb kommt dort nichts direkt hin.

## Branches und Pull Requests

1. Für jede Änderung einen Branch: `git switch -c feature/kurze-beschreibung` (oder `fix/...`).
2. Kleine Commits mit aussagekräftigen Nachrichten (siehe unten).
3. Pushen und auf GitHub einen Pull Request nach `main` öffnen.
4. Die CI (`.github/workflows/ci.yml`) muss grün sein: TypeScript, Lint, Backend-Tests.
5. Erst dann mergen.

## Mergen und Konflikte

Ein Merge ist erst fertig, wenn die App wieder **baut und startet**:

```bash
git fetch origin
git switch mein-branch
git merge origin/main
# Konflikte lösen: in jeder Datei die Blöcke <<<<<<< ======= >>>>>>> von Hand zusammenführen
git grep -nE '^(<<<<<<<|=======|>>>>>>>)'      # darf nichts mehr finden
cd Frontend && npm ci && npm run typecheck && npm run lint && npx expo start --clear
cd ../Backend && python -m pytest
git commit
```

Nie einen alten lokalen Stand einfach drübermergen. Wenn der lokale Ordner veraltet ist: frisch klonen
oder `git fetch && git reset --hard origin/main` (vorher eigene, ungesicherte Änderungen sichern).

## Commit-Messages

Erste Zeile: was und warum, im Imperativ, max. ca. 70 Zeichen. Nicht „update“, „commit“ oder „raspi“.

- gut: `Backend: LED-Animation mit eigenem Stop-Event pro Lauf`
- gut: `Login: Passwort mindestens 10 Zeichen`
- schlecht: `update`

## Empfohlene GitHub-Einstellung

Settings → Branches → Branch protection rule für `main`: „Require a pull request before merging“ und
„Require status checks to pass“ (Check `CI`). Damit kann niemand mehr versehentlich direkt auf `main` pushen.
