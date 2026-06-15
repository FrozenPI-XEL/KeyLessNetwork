# KeyLessNetwork

## Ordnerstruktur

```
keylessnetwork/
├── app.json
├── babel.config.js
├── eslint.config.js
├── global.css
├── metro.config.js
├── nativewind-env.d.ts
├── package.json
├── README.md
├── tailwind.config.js
├── tsconfig.json
├── assets/
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash-icon.png
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── admin.tsx
│   │   │   ├── index.tsx
│   │   │   ├── profile.tsx
│   │   │   └── (stack)/
│   │   │       ├── _layout.tsx
│   │   │       ├── list-items.tsx
│   │   │       ├── loading.tsx
│   │   │       └── items/
│   ├── components/
│   │   ├── AppText.tsx
│   │   ├── rollenauswahl.tsx
│   │   ├── zeitauswahl.tsx
│   │   └── Button.tsx
│   ├── hooks/
│   │   └── userService.ts
│   ├── store/
│   │   └── authStore.ts
│   └── utils/
│       ├── cn.ts
│       └── TestDB/
│           └── users.json
```

## Erklärung der wichtigsten Dateien und Ordner

- **app.json**: Konfigurationsdatei für die App, z.B. Name, Icons, Version.
- **babel.config.js**: Konfiguration für Babel, den JavaScript-Compiler.
- **eslint.config.js**: Regeln und Einstellungen für den Code-Linter ESLint.
- **global.css**: Globale CSS-Styles für die Anwendung.
- **metro.config.js**: Konfiguration für den Metro-Bundler (React Native).
- **nativewind-env.d.ts**: TypeScript-Definitionen für NativeWind.
- **package.json**: Enthält Metadaten, Abhängigkeiten und Skripte für das Projekt.
- **README.md**: Projektbeschreibung und Dokumentation.
- **tailwind.config.js**: Konfiguration für das Tailwind CSS-Framework.
- **tsconfig.json**: TypeScript-Konfiguration für das Projekt.

### assets/
Bilder und Icons, die in der App verwendet werden (z.B. App-Icon, Splash-Screen).

### src/
Quellcode der Anwendung.

- **app/**  
  Enthält die Hauptseiten und Layouts der App.
  - **_layout.tsx**: Definiert das generelle Layout der App.
  - **login.tsx**: Login-Seite.
  - **(tabs)/**: Tab-Navigation mit verschiedenen Seiten.
    - **_layout.tsx**: Layout für die Tabs.
    - **admin.tsx**: Admin-Bereich.
    - **index.tsx**: Startseite der Tabs.
    - **profile.tsx**: Profilseite.
    - **(stack)/**: Stack-Navigation innerhalb der Tabs.
      - **_layout.tsx**: Layout für den Stack.
      - **list-items.tsx**: Listet Items auf.
      - **loading.tsx**: Ladeanzeige.
      - **items/**: Weitere Komponenten/Seiten für Items.

- **components/**  
  Wiederverwendbare UI-Komponenten.
  - **AppText.tsx**: Eigene Text-Komponente.
  - **Button.tsx**: Eigene Button-Komponente.

- **utils/**  
  Hilfsfunktionen und Utilities.
  - **cn.ts**: Utility für das Zusammenführen von CSS-Klassen.

---
