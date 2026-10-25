# SV Lollar – Vereinsverwaltung (Industrie 4.0 Projekt)

Webanwendung zur Verwaltung eines Schützenvereins: Mitglieder, Gäste, Disziplinen und Kaliber, Trainingstage und Anwesenheit, Kasse, Theke und Verkäufe sowie Berichte. Der Zugriff ist rollenbasiert.

Entstanden als Gruppenprojekt im Modul **Industrie 4.0** an der THM (SS 2025).

## Aufbau

| Ordner | Inhalt |
|---|---|
| `backend/` | REST-API mit Express.js, PostgreSQL, Sessions und HTTPS (siehe [backend/README.md](backend/README.md)). In `HTTP/` liegen Beispiel-Requests. |
| `frontend/` | Express-Server und HTML/CSS/JavaScript-Oberfläche (`src/htmlfiles`, `src/javascriptfiles`) |
| `db/` | SQL-Skripte: Datenbank, Benutzer, Tabellen und Beispieldaten anlegen |
| `Ideas/` | Datenbankmodell, Diagramme und Panel-Entwürfe |

## Schnellstart

1. Datenbank anlegen: `db/create_db.sql`, `db/create_user.sql`, `db/create_tables.sql` und `db/init_data.sql` ausführen. Vorher die Platzhalter `<DB_PASSWORT>` in `create_user.sql` und `<ADMIN_PASSWORT_HASH>` in `init_data.sql` durch eigene Werte ersetzen. Wie der Hash erzeugt wird, steht in `init_data.sql`.
2. Lokale HTTPS-Zertifikate erzeugen und jeweils in `backend/cert/` und `frontend/cert/` ablegen:
   `openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365`
3. In `backend/` eine Datei `.env` anlegen (Vorlage in `backend/README.md`), dann `npm install` und `node server.js` ausführen.
4. In `frontend/` ebenfalls `npm install` ausführen und den Server mit den Umgebungsvariablen `SESSION_SECRET`, `ADMIN_USER` und `ADMIN_PASSWORD` starten (`node server.js`).
5. Für die Beispiel-Requests in `backend/HTTP/` die Datei `http-client.private.env.json.example` nach `http-client.private.env.json` kopieren und die Passwörter eintragen.

Zertifikate, `.env` und Passwörter sind bewusst nicht im Repository.

## Mitwirkung

Gaby Fotio, im Rahmen eines Gruppenprojekts an der THM. Die Entwicklung fand ursprünglich im THM-GitLab statt. Dieses Repository ist ein bereinigter Snapshot vom Stand 24.06.2025.
