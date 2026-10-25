-- PostgreSQL-Skript: Mitgliederverwaltung Schützenverein 

-- Tabelle: Mitglieder
CREATE TABLE Mitglieder (
  MitgliedsID SERIAL PRIMARY KEY,
  Vorname VARCHAR(100) NOT NULL,
  Nachname VARCHAR(100) NOT NULL,
  WBK_Vorhanden BOOLEAN DEFAULT FALSE,
  Rolle VARCHAR(20) DEFAULT 'MITGLIED' CHECK (Rolle IN ('GAST', 'MITGLIED')),
  Erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Aktiv BOOLEAN DEFAULT TRUE
);

-- Tabelle: Nutzer (Login-Daten mit administrativer Rolle)
CREATE TABLE Nutzer (
  NutzerID SERIAL PRIMARY KEY,
  MitgliedsID INT UNIQUE NOT NULL REFERENCES Mitglieder(MitgliedsID) ON DELETE CASCADE,
  Benutzername VARCHAR(50) NOT NULL UNIQUE,
  PasswortHash TEXT NOT NULL,
  Rolle VARCHAR(20) NOT NULL CHECK (Rolle IN ('ADMIN', 'THEKENDIENST', 'KASSIERER')),
  IstAktiv BOOLEAN DEFAULT TRUE,
  LetzterLogin TIMESTAMP
);

-- Tabelle: KaliberGebuehren
CREATE TABLE KaliberGebuehren (
  KaliberID SERIAL PRIMARY KEY,
  Bezeichnung VARCHAR(50) NOT NULL,
  GebuehrMitglied NUMERIC(6,2) NOT NULL,
  GebuehrGastZuschlag NUMERIC(6,2) NOT NULL DEFAULT 5.00
);

-- Tabelle: Anwesenheit
CREATE TABLE Anwesenheit (
  AnwesenheitsID SERIAL PRIMARY KEY,
  Datum DATE NOT NULL,
  MitgliedsID INT REFERENCES Mitglieder(MitgliedsID),
  Schiessgebuehr NUMERIC(6,2),
  ErfasstAm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zwischentabelle: Anwesenheit_Kaliber
CREATE TABLE Anwesenheit_Kaliber (
  AnwesenheitsID INT NOT NULL REFERENCES Anwesenheit(AnwesenheitsID),
  KaliberID INT NOT NULL REFERENCES KaliberGebuehren(KaliberID),
  PRIMARY KEY (AnwesenheitsID, KaliberID)
);

-- Tabelle: Produkte
CREATE TABLE Produkte (
  ProduktID SERIAL PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Kategorie VARCHAR(20) NOT NULL CHECK (Kategorie IN ('Drink', 'Snack', 'Ammunition', 'Penalty')),
  Preis NUMERIC(6,2) NOT NULL,
  Aktiv BOOLEAN DEFAULT TRUE
);

-- Tabelle: Verkaeufe
CREATE TABLE Verkaeufe (
  VerkaufID SERIAL PRIMARY KEY,
  AnwesenheitsID INT NOT NULL REFERENCES Anwesenheit(AnwesenheitsID),
  ProduktID INT NOT NULL REFERENCES Produkte(ProduktID),
  Menge INT NOT NULL DEFAULT 1,
  RabattProzent NUMERIC(5,2) DEFAULT 0.00,
  Gesamtpreis NUMERIC(6,2) NOT NULL
);

-- Tabelle: Tagesabschluesse
CREATE TABLE Tagesabschluss (
  AbschlussID SERIAL PRIMARY KEY,
  AbschlussDatum DATE NOT NULL UNIQUE,
  ErstelltAm TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ErstelltDurch VARCHAR(50) NOT NULL REFERENCES Nutzer(Benutzername),
  ModifiziertDurch INT REFERENCES Mitglieder(MitgliedsID)
);

-- Tabelle: Tagesabschluss_Verkaeufe
CREATE TABLE Tagesabschluss_Verkaeufe (
  AbschlussID INT NOT NULL REFERENCES Tagesabschluss(AbschlussID),
  VerkaufID INT NOT NULL REFERENCES Verkaeufe(VerkaufID),
  PRIMARY KEY (AbschlussID, VerkaufID)
);