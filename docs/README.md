# KeyLessNetwork - Projektdokumentation

## Übersicht
KeyLessNetwork ist eine mobile Anwendung (React Native mit Expo) für die sichere Benutzerverwaltung mit Supabase-Integration.

## Ordnerstruktur

```
KeyLessNetwork/
├── Backend/
│   └── server.py                 # Python-Backend-Server
│
├── Frontend/                      # React Native (Expo) Mobile App
│   ├── src/
│   │   ├── app/
│   │   │   ├── _layout.tsx       # Root-Layout mit Stack Navigation
│   │   │   ├── login.tsx         # Login-Bildschirm mit Registrierung-Link
│   │   │   ├── register.tsx      # Registrierung mit 
Code-Validierung
|   |   |   ├──index.tsx
│   │   │   ├── profile-setup.tsx # Profil-Erstellung (Username + Passwort)
│   │   │   └── (tabs)/
│   │   │       ├── _layout.tsx   # Tab Navigation
│   │   │       ├── admin.tsx     # Admin-Panel
│   │   │       ├── controll.tsx  # Kontrolle/Dashboard
│   │   │       ├── index.tsx     # Home-Screen
│   │   │       └── profile.tsx   # Benutzer-Profil
│   │   ├── components/           # Wiederverwendbare UI-Komponenten
│   │   │   ├── InfoCard.tsx
│   │   │   ├── PiForm.tsx
│   │   │   ├── rollenauswahl.tsx
│   │   │   └── zeitauswahl.tsx
│   │   ├── hooks/
│   │   │   └── supabase-client.ts # Supabase-Konfiguration
│   │   ├── store/
│   │   │   ├── authStore.ts      # Auth State Management
│   │   │   └── userStore.ts      # User State Management
│   │   └── neueStores/
│   │       ├── AuthStore.ts      # Alternative Auth Store
│   │       └── SubscriptionStore.ts
│   ├── assets/                   # Bilder und andere Assets
│   ├── .env.local                # Environment-Variablen (GIT IGNORE!)
│   ├── package.json              # Dependencies
│   ├── tsconfig.json             # TypeScript-Konfiguration
│   ├── tailwind.config.js        # Tailwind CSS Setup
│   ├── metro.config.js           # Expo Metro Bundler Config
│   ├── babel.config.js           # Babel-Konfiguration
│   ├── global.css                # Globale Styles
│   └── README.md                 # Frontend-Dokumentation
│
├── Supabase/                      # Datenbank-Setup
│   └── create_tables.sql         # SQL für Tabellenerstellung
│
└── docs/                          # Dokumentation
    ├── README.md                 # Diese Datei
    └── COMMITS.md                # Commit-History
```

## Authentifizierung & Registrierung

### Registrierungsprozess
1. **Register-Screen** (`register.tsx`)
   - Benutzer gibt einen 8-stelligen Code ein
   - Code wird in Supabase-Tabelle `codes` validiert
   - Falls Code existiert und nicht genutzt: markiere als `genutzt = true`
   - Falls Code invalide oder bereits genutzt: Fehlermeldung

2. **Profil-Setup** (`profile-setup.tsx`)
   - Benutzer gibt Benutzername und persönlichen Code (8 Zeichen) ein
   - Beide Werte werden in Supabase gespeichert
   - Weiterleitung zum Login

### Login-Prozess
- Benutzer gibt Benutzername und persönlichen Code (code2) ein
- Validierung gegen lokalen User-Store
- Bei erfolgreichem Login: Zugriff auf Tabs-Navigation

## Datenbank-Schema

### Tabelle: `codes`
| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | BIGINT | Primary Key |
| code | TEXT | 8-stelliger Registrierungscode (UNIQUE) |
| username | TEXT | Benutzername (optional bis zur Profilerstellung) |
| code2 | TEXT | Persönliches Passwort des Benutzers (8 Zeichen) |
| genutzt | BOOLEAN | Gibt an, ob Code bereits verwendet wurde |
| created_at | TIMESTAMP | Erstellungsdatum |
| updated_at | TIMESTAMP | Letzte Änderung |

## Umgebungsvariablen

In `Frontend/.env.local` konfigurieren:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Wichtig**: `.env.local` darf nicht in Git commitet werden!

## Styling & Design

- **CSS-Framework**: Tailwind CSS mit NativeWind
- **Komponenten-Pattern**: Floating Input Labels mit React Native Animated API
- **Theme**: Dark Mode (Slate-900 Background, Indigo Accents)

## Stack & Dependencies

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: Expo Router
- **State Management**: Zustand (AuthStore, UserStore)
- **Forms**: React Hook Form
- **Backend**: Supabase JavaScript Client
- **Styling**: Tailwind CSS + NativeWind
- **Icons**: Expo Vector Icons (Ionicons)

### Backend
- **Framework**: Python (Flask/FastAPI - siehe server.py)

## Entwicklungs-Workflow

### Installation
```bash
cd Frontend
npm install
npm run start
```

### Neue Komponenten erstellen
1. Datei unter `src/components/` erstellen
2. Bei UI-Elementen Tailwind CSS verwenden
3. In entsprechender Screen-Datei importieren und nutzen

### Datenbank-Änderungen
1. SQL-Statements in `Supabase/create_tables.sql` dokumentieren
2. Via Supabase Dashboard oder API ausführen
3. Commit mit Beschreibung erstellen

## Sicherheitshinweise

⚠️ **Wichtig**:
- Niemals `.env.local` committen
- Codes sollten in Produktion gehasht werden
- Passwort (code2) sollte verschlüsselt gespeichert werden
- Implementiere Rate Limiting für Registrierung
- HTTPS wird für Supabase automatisch erzwungen

## Zukünftige Erweiterungen

- [ ] Two-Factor Authentication
- [ ] Admin-Dashboard erweitern
- [ ] Email-Verifizierung
- [ ] Code-Bulk-Upload
- [ ] Analytics & Logging
- [ ] Role-Based Access Control
