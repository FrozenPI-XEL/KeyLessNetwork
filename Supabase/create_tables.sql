-- Erstelle die codes Tabelle mit Role Spalte für Admin-Verwaltung
CREATE TABLE IF NOT EXISTS codes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code TEXT NOT NULL UNIQUE,
  username TEXT,
  Role BOOLEAN DEFAULT false,
  genutzt BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Erstelle Indizes für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_codes_code ON codes(code);
CREATE INDEX IF NOT EXISTS idx_codes_username ON codes(username);

-- Trigger um updated_at automatisch zu aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_codes_updated_at ON codes;
CREATE TRIGGER update_codes_updated_at BEFORE UPDATE ON codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Erstelle die raspberry_pis Tabelle
CREATE TABLE IF NOT EXISTS raspberry_pis (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  port INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indizes für raspberry_pis
CREATE INDEX IF NOT EXISTS idx_raspberry_pis_name ON raspberry_pis(name);

-- Trigger für raspberry_pis updated_at
DROP TRIGGER IF EXISTS update_raspberry_pis_updated_at ON raspberry_pis;
CREATE TRIGGER update_raspberry_pis_updated_at BEFORE UPDATE ON raspberry_pis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS aktivieren
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE raspberry_pis ENABLE ROW LEVEL SECURITY;

-- Öffentliche Policies für codes Tabelle
DROP POLICY IF EXISTS "Allow public select codes" ON codes;
DROP POLICY IF EXISTS "Allow public insert codes" ON codes;
DROP POLICY IF EXISTS "Allow public update codes" ON codes;

CREATE POLICY "Allow public select codes" ON codes FOR SELECT USING (true);
CREATE POLICY "Allow public insert codes" ON codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update codes" ON codes FOR UPDATE USING (true) WITH CHECK (true);

-- Öffentliche Policies für raspberry_pis Tabelle
DROP POLICY IF EXISTS "Allow public select pis" ON raspberry_pis;
DROP POLICY IF EXISTS "Allow public insert pis" ON raspberry_pis;
DROP POLICY IF EXISTS "Allow public update pis" ON raspberry_pis;
DROP POLICY IF EXISTS "Allow public delete pis" ON raspberry_pis;

CREATE POLICY "Allow public select pis" ON raspberry_pis FOR SELECT USING (true);
CREATE POLICY "Allow public insert pis" ON raspberry_pis FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update pis" ON raspberry_pis FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete pis" ON raspberry_pis FOR DELETE USING (true);
