-- Mitglied für Admin anlegen
INSERT INTO Mitglieder (Vorname, Nachname, Rolle)
VALUES ('Max', 'Mustermann', 'MITGLIED');

-- Admin-Nutzer: <ADMIN_PASSWORT_HASH> durch einen bcrypt-Hash ersetzen, z. B.:
-- cd backend && node -e "console.log(require('bcrypt').hashSync('DEIN_PASSWORT', 10))"
INSERT INTO Nutzer (MitgliedsID, Benutzername, PasswortHash, Rolle)
VALUES (
  1,
  'admin',
  '<ADMIN_PASSWORT_HASH>',
  'ADMIN'
);

-- Produkte: Getränke, Snacks, Munition
INSERT INTO Produkte (Name, Kategorie, Preis)
VALUES
  ('Cola', 'Drink', 1.50),
  ('Fanta', 'Drink', 1.50),
  ('Bier', 'Drink', 2.00),
  ('Snickers', 'Snack', 1.00),
  ('9mm 50 Stk', 'Ammunition', 15.00),
  ('Deckenschuss', 'Penalty', 5.00);