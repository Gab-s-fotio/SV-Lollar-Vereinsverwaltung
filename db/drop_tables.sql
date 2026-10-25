-- PostgreSQL-Skript: Mitgliederverwaltung Schützenverein 

-- Tabelle: Mitglieder
DROP TABLE Mitglieder CASCADE;

-- Tabelle: Nutzer (Login-Daten mit administrativer Rolle)
DROP TABLE Nutzer CASCADE;

-- Tabelle: KaliberGebuehren
DROP TABLE KaliberGebuehren CASCADE;

-- Tabelle: Anwesenheit
DROP TABLE Anwesenheit CASCADE;

-- Zwischentabelle: Anwesenheit_Kaliber
DROP TABLE Anwesenheit_Kaliber CASCADE;

-- Tabelle: Produkte
DROP TABLE Produkte CASCADE;

-- Tabelle: Verkaeufe
DROP TABLE Verkaeufe CASCADE;

-- Tabelle: Tagesabschluesse
DROP TABLE Tagesabschluss CASCADE;

-- Tabelle: Tagesabschluss_Verkaeufe
DROP TABLE Tagesabschluss_Verkaeufe CASCADE;