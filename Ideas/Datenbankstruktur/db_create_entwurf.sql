-- SQL-Datei: Mitgliederverwaltung Schützenverein

-- Tabelle: Mitglieder
CREATE TABLE Mitglieder (
  MitgliedsID INT PRIMARY KEY AUTO_INCREMENT,
  Vorname VARCHAR(100) NOT NULL,
  Nachname VARCHAR(100) NOT NULL,
  WBK_Vorhanden BOOLEAN DEFAULT FALSE,
  Rolle ENUM DEFAULT 'MITGLIED'
);

-- Tabelle: KaliberGebuehren
CREATE TABLE KaliberGebuehren (
  KaliberID INT PRIMARY KEY AUTO_INCREMENT,
  Bezeichnung VARCHAR(50) NOT NULL,       -- z. B. 'KK', 'GK', 'Luftgewehr'
  GebuehrMitglied DECIMAL(6,2) NOT NULL,
  GebuehrGastZuschlag DECIMAL(6,2) NOT NULL DEFAULT 5.00
);

-- Tabelle: Anwesenheit (Schießeintrag)
CREATE TABLE Anwesenheit (
  AnwesenheitsID INT PRIMARY KEY AUTO_INCREMENT,
  Datum DATE NOT NULL,
  MitgliedsID INT,
  Schiessgebuehr DECIMAL(6,2),
  ErfasstAm DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (MitgliedsID) REFERENCES Mitglieder(MitgliedsID)
);

-- Zwischentabelle: Anwesenheit_Kaliber
CREATE TABLE Anwesenheit_Kaliber (
  AnwesenheitsID INT NOT NULL,
  KaliberID INT NOT NULL,
  PRIMARY KEY (AnwesenheitsID, KaliberID),
  FOREIGN KEY (AnwesenheitsID) REFERENCES Anwesenheit(AnwesenheitsID),
  FOREIGN KEY (KaliberID) REFERENCES KaliberGebuehren(KaliberID)
);

-- Tabelle: Produkte (Snacks, Getränke, Munition etc.)
CREATE TABLE Produkte (
  ProduktID INT PRIMARY KEY AUTO_INCREMENT,
  Name VARCHAR(100) NOT NULL,
  Kategorie ENUM('Getränk', 'Snack', 'Munition') NOT NULL,
  Preis DECIMAL(6,2) NOT NULL,
  Aktiv BOOLEAN DEFAULT TRUE
);

-- Tabelle: Verkaeufe
CREATE TABLE Verkaeufe (
  VerkaufID INT PRIMARY KEY AUTO_INCREMENT,
  AnwesenheitsID INT NOT NULL,
  ProduktID INT NOT NULL,
  Menge INT NOT NULL DEFAULT 1,
  RabattProzent DECIMAL(5,2) DEFAULT 0.00,
  Gesamtpreis DECIMAL(6,2) NOT NULL,
  FOREIGN KEY (AnwesenheitsID) REFERENCES Anwesenheit(AnwesenheitsID),
  FOREIGN KEY (ProduktID) REFERENCES Produkte(ProduktID)
);

-- Tabelle: Tagesabschluesse
CREATE TABLE Tagesabschluss (
  AbschlussID INT PRIMARY KEY AUTO_INCREMENT,
  AbschlussDatum DATE NOT NULL UNIQUE,
  ErstelltAm DATETIME DEFAULT CURRENT_TIMESTAMP,
  ErstelltDurch INT NOT NULL,
  ModifiziertDurch INT,
  FOREIGN KEY (ErstelltDurch) REFERENCES Mitglieder(MitgliedsID),
  FOREIGN KEY (ModifiziertDurch) REFERENCES Mitglieder(MitgliedsID)
);

-- Tabelle: Tagesabschluss_Referenz (welche Verkäufe dazugehören)
CREATE TABLE Tagesabschluss_Verkaeufe (
  AbschlussID INT NOT NULL,
  VerkaufID INT NOT NULL,
  PRIMARY KEY (AbschlussID, VerkaufID),
  FOREIGN KEY (AbschlussID) REFERENCES Tagesabschluss(AbschlussID),
  FOREIGN KEY (VerkaufID) REFERENCES Verkaeufe(VerkaufID)
);
