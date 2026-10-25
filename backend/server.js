// server.js

const {
    ERR_DB,
    ERR_QUERY,
    ERR_LOGIN,
    ERR_LOGOUT,
    ERR_CREAT_USER,

    INF_SERVER_STARTET,
    INF_QUERY_RESULT,
    INF_QUERY,
    SUC_CREATE_USER,
    SUC_LOGIN,
    SUC_LOGOUT,
} = require('./utils/messages');

require('dotenv').config();
const { Pool } = require('pg');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const https = require('https');
const fs = require('fs');


require('events').EventEmitter.defaultMaxListeners = 10; // Erhöht die maximale Anzahl an Event-Listenern

// Zertifikate laden
const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
};

// PostgreSQL-Verbindung
const db = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

// REST API-Server
const app = express();
app.use(express.json());
app.use(cors({
  origin: 'https://localhost:3001', 
  credentials: true
}));

// Starten des REST API-Servers
https.createServer(sslOptions, app).listen(process.env.PORT, () => {
    console.log(INF_SERVER_STARTET(process.env.PORT));
});

app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET,     // Ein geheimer Schlüssel für die Session
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,       // true in HTTPS-Umgebungen
        httpOnly: true,
        sameSite: 'none', // 'lax' oder 'strict' für andere Umgebungen
    }
}));

/*
Routes:

/users
 - GET      | List all users with their username and role
 - POST     | Create a new user

/users/:username
 - GET      | Get full details of the specified user
 - PATCH    | Update user details

/login
 - GET      | Get the currently authenticated user (session info)
 - POST     | Log in a user

/logout
 - POST     | Log out the current user

//todo: implement
/theke/:year/:month/:day
 - GET      | Get all details for a "Thekendienst" day, including members, calibers, sales, editors, and closing details

 //todo document erzeugen
/theke/:year/:month/:day/abschluss
 - POST     | Close the day and create a daily report

/mitglieder
 - GET      | List all members
 - POST     | Add new member

/mitglieder/:id
 - GET      | Get full member details
 - PUT      | Update member information
 - DELETE   | Delete member

/personen
 - GET      | List all persons
 - POST     | Add new person

/personen/:id
 - GET      | Get full persons details
 - PUT      | Update persons information

/gaeste
 - GET      | List all guests
 - POST     | Add new guest

/gaeste/:id
 - GET      | Get full guests details
 - PUT      | Update guest information

/produkte
 - GET      | List all available products
 - POST     | Add new product

/produkte/:id
 - GET      | Get Details of a product
 - PUT      | Update product
 - DELETE   | Deactivate product

/anwesenheiten
 - GET      | List all attendance entries
 - POST     | Register a shooting session

/anwesenheiten/mitglied/:memberId
 - GET      | List all attendance records for a specific member

/anwesenheiten/mitglied/:memberId/datum/:datum
 - GET      | Get specific attendance record
 - PUT      | Update attendance record
 - DELETE   | Delete attendance record

/anwesenheiten/datum/:datum
 - GET      | List all attendance records for a specific date

/anwesenheiten/mitglied/:memberId/verkaeufe
 - GET      | List all sales for a specific member
 - POST     | Create a new sale for a specific member

/anwesenheiten/mitglied/:memberId/datum/:datum/verkaeufe
 - GET      | List all sales for a specific member on a specific date

//todo implement
/anwesenheiten/mitglied/:memberId/datum/:datum/verkaeufe/kosten

/anwesenheiten/mitglied/:memberId/datum/:datum/kaliber
 - GET      | List all calibers used by a specific member on a specific date
 - POST     | Add a new caliber for a specific member on a specific date

/kaliber
 - GET      | List all calibers and fees
 - POST     | Add a new caliber

/kaliber/:id
 - GET      | Get details of caliber
 - PUT      | Update caliber

  //todo: implement
/berichte/taeglich
 - GET      | List all daily reports

  //todo: implement
/berichte/taeglich/:datum
 - GET      | Get specific daily report


/verkaeufe
 - GET      | List all sales across all users and dates

/verkaeufe/:memberId
 - GET      | List all sales made by a specific member (identified by Member ID)
 - PUT      | Update a sale made by a specific member //todo implement

 /produkte/type/:type
 - GET      | List all products of a specific type (e.g., 'snack', 'drink', etc.)
*/

async function dbconnect(res) {
    try {
        return await db.connect();
    } catch (err) {
        console.error(ERR_DB, err.message);
        res.status(500).json({ error: 'Datenbankverbindung fehlgeschlagen' });
        return null;
    }
}

// Middleware to log requests
app.use((req, res, next) => {
    console.log(INF_QUERY(req.method, req.url));
    next();
});

//Login-Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
    }

    const client = await dbconnect();
    try {
        const result = await client.query(
            'SELECT * FROM Nutzer WHERE Benutzername = $1 AND IstAktiv = true;',
            [username]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        const isValid = await bcrypt.compare(password, user.passworthash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        await client.query(
            'UPDATE Nutzer SET LetzterLogin = NOW() WHERE Benutzername = $1',
            [user.benutzername]);

        req.session.user = {
            benutzername: user.benutzername,
            rolle: user.rolle
        };

        console.log(SUC_LOGIN(username));
        res.json({ message: 'Erfolgreich eingeloggt', user: req.session.user });

    } catch (err) {
        console.error(ERR_LOGIN, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Nicht eingeloggt' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(ERR_LOGOUT, err);
            return res.status(500).json({ error: 'Logout fehlgeschlagen' });
        }
        res.clearCookie('connect.sid'); // optional: Session-Cookie löschen
        console.log(SUC_LOGOUT);
        res.json({ message: 'Erfolgreich ausgeloggt' });
    });
});

//Temp Debugging Middleware
app.get('/session-debug', (req, res) => {
    res.json({ session: req.session });
});

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Nicht autorisiert' });
    }
    next();
}

// Route: /users
app.get('/users', requireLogin,async (req, res) => {

    const client = await dbconnect();
    try {
        const result = await client.query(
            'SELECT benutzername,rolle,istaktiv FROM Nutzer;'
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.post('/users', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid, username: benutzername, passwort, rolle } = req.body;
        const passworthash = await bcrypt.hash(passwort, 10);
        const result_select = await client.query(
            'SELECT benutzername FROM Nutzer WHERE benutzername = $1;',
            [benutzername]
        );
        if (result_select.rows.length > 0) {
            console.error(ERR_CREAT_USER(benutzername));
            return res.status(400).json({ error: 'Benutzername bereits vergeben' });
        }
        const result = await client.query(
            'INSERT INTO Nutzer (MitgliedsID, Benutzername, PasswortHash, Rolle) VALUES ($1, $2, $3, $4) RETURNING *;',
            [mitgliedsid, benutzername, passworthash, rolle]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        if (result.rowCount === 0) {
            return res.status(400).json({ error: 'Benutzer konnte nicht erstellt werden' });
        } else if (result.rowCount > 1) {
            return res.status(400).json({ error: 'Mehrere Benutzer mit diesem Benutzernamen gefunden' });
        } else if (result.rowCount === 1) {
            console.log(SUC_CREATE_USER(benutzername));
            res.status(201).json({ message: 'Benutzer erfolgreich erstellt' });
        }
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
})

// Route: /users/:username
app.get('/users/:username', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const {username} = req.params;
        //todo: think about it
        console.log(username);
        const result = await client.query(
            'SELECT NutzerID, MitgliedsID, Benutzername, Rolle, IstAktiv, LetzterLogin FROM Nutzer where Benutzername = $1;',
            [username]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

//todo aktivieren erlauben

app.delete('/users/:username', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { username } = req.params;
        const result = await client.query(
            'UPDATE Nutzer SET Aktiv = false WHERE Benutzername = $1 RETURNING *;',
            [username]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json({ message: 'Benutzer deaktiviert', user: result.rows[0] });
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

async function insertPerson(req, res){
    const client = await dbconnect();
    try {
        let result;
        const { vorname, nachname } = req.body;
        if(req.mitglied){
            result = await client.query(
                "INSERT INTO Mitglieder (Vorname, Nachname, Rolle) VALUES ($1, $2, 'MITGLIED') RETURNING *;",
                [vorname, nachname]
            );
        } else if(req.gast){
            result = await client.query(
                "INSERT INTO Mitglieder (Vorname, Nachname, Rolle) VALUES ($1, $2, 'GAST') RETURNING *;",
                [vorname, nachname]
            );
        } else {
            const { rolle } = req.body;
            result = await client.query(
                "INSERT INTO Mitglieder (Vorname, Nachname, Rolle) VALUES ($1, $2, $3) RETURNING *;",
                [vorname, nachname, rolle]
            );
        }
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
}

async function getPerson(req, res){
    const client = await dbconnect();
    try {
        let result;
        if(req.mitglied){
            result = await client.query(
                "SELECT MitgliedsID, vorname, nachname FROM Mitglieder WHERE rolle = 'MITGLIED';"
            );
        } else if(req.gast){
            result = await client.query(
                "SELECT MitgliedsID, vorname, nachname FROM Mitglieder WHERE rolle = 'GAST';"
            );
        } else {
            result = await client.query(
                "SELECT MitgliedsID, vorname, nachname FROM Mitglieder;"
            );
        }
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
}

async function getPersonDetail(req, res){
    const client = await dbconnect();
    try {
        const { id }  = req.params;
        let result;
        if(req.mitglied){
            result = await client.query(
                "SELECT * FROM Mitglieder WHERE mitgliedsid = $1 AND rolle = 'MITGLIED';",
                [id]
            );
        } else if(req.gast){
            result = await client.query(
                "SELECT * FROM Mitglieder WHERE mitgliedsid = $1 AND rolle = 'GAST';",
                [id]
            );
        } else {
            result = await client.query(
                'SELECT * FROM Mitglieder WHERE mitgliedsid = $1;',
                [id]
            );
        }
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }

}

// Routen für Personen
app.get('/personen', requireLogin, getPerson);
app.post('/personen', requireLogin, insertPerson);
app.get('/personen/:id', requireLogin, getPersonDetail);

// Routen für Mitglieder
app.get('/mitglieder', requireLogin, async (req, res, next) => {
    req.mitglied = true;  // Kennzeichnung setzen
    await getPerson(req, res);
});
app.post('/mitglieder', requireLogin, async (req, res, next) => {
    req.mitglied = true;  // Kennzeichnung setzen
    await insertPerson(req, res);
});
app.get('/mitglieder/:id', requireLogin, async  (req, res, next) => {
    req.mitglied = true;  // Kennzeichnung setzen
    await getPersonDetail(req, res);
});

// Routen für Gäste
app.get('/gaeste', requireLogin, async (req, res, next) => {
    req.gast = true;  // Kennzeichnung setzen
    await getPerson(req, res);
});
app.post('/gaeste', requireLogin, async (req, res, next) => {
    req.gast = true;  // Kennzeichnung setzen
    await insertPerson(req, res);
});
app.get('/gaeste/:id', requireLogin, async (req, res, next) => {
    req.gast = true;  // Kennzeichnung setzen
    await getPersonDetail(req, res);
});

// Route: /produkte
app.get('/produkte', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const result = await client.query(
            'SELECT ProduktID, Name, Kategorie FROM Produkte;'
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.post('/produkte', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { name, preis, kategorie } = req.body;
        const result = await client.query(
            'INSERT INTO Produkte (Name, Preis, Kategorie) VALUES ($1, $2, $3) RETURNING *;',
            [name, preis, kategorie]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /produkte/:id
app.get('/produkte/:id', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { id } = req.params;
        const result = await client.query(
            'SELECT * FROM Produkte WHERE ProduktID = $1;',
            [id]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.put('/produkte/:id', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { id } = req.params;
        const { name, preis, kategorie, aktiv } = req.body;
        const result = await client.query(
            'UPDATE Produkte SET Name = $1, Preis = $2, Kategorie = $3, Aktiv = $4 WHERE ProduktID = $5 RETURNING *;',
            [name, preis, kategorie, aktiv, id]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.delete('/produkte/:id', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { id } = req.params;
        const result = await client.query(
            'UPDATE Produkte SET Aktiv = false WHERE ProduktID = $1 RETURNING *;',
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Produkt nicht gefunden' });
        }
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json({ message: 'Produkt deaktiviert', produkt: result.rows[0] });
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /anwesenheiten
app.get('/anwesenheiten', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const result = await client.query(
            'SELECT AnwesenheitsID, MitgliedsID, Datum FROM Anwesenheit;'
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.post('/anwesenheiten', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid, datum, schiessgebuehr } = req.body;
        // Prüfen, ob für das Mitglied an diesem Tag bereits eine Anwesenheit existiert
        const checkResult = await client.query(
            'SELECT * FROM Anwesenheit WHERE MitgliedsID = $1 AND Datum = $2;',
            [mitgliedsid, datum]
        );
        if (checkResult.rowCount > 0) {
            return res.status(400).json({ error: 'Anwesenheit für diesen Tag bereits erfasst' });
        }
        const result = await client.query(
            'INSERT INTO Anwesenheit (MitgliedsID, Datum, Schiessgebuehr) VALUES ($1, $2, $3) RETURNING *;',
            [mitgliedsid, datum, schiessgebuehr]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /anwesenheiten/:mitgliedsid
app.get('/anwesenheiten/mitglied/:mitgliedsid', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid } = req.params;
        const result = await client.query(
            'SELECT * FROM Anwesenheit WHERE MitgliedsID = $1;',
            [mitgliedsid]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /anwesenheiten/:mitgliedsid/:datum
app.get('/anwesenheiten/mitglied/:mitgliedsid/datum/:datum', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid, datum } = req.params;
        const result = await client.query(
            'SELECT * FROM Anwesenheit WHERE MitgliedsID = $1 AND Datum = $2;',
            [mitgliedsid, datum]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Anwesenheit nicht gefunden' });
        }
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});
app.put('/anwesenheiten/mitglied/:mitgliedsid/datum/:datum', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid, datum } = req.params;
        const { schiessgebuehr } = req.body;
        const result = await client.query(
            'UPDATE Anwesenheit SET Schiessgebuehr = $1 WHERE MitgliedsID = $2 AND Datum = $3 RETURNING *;',
            [schiessgebuehr, mitgliedsid, datum]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.delete('/anwesenheiten/mitglied/:mitgliedsid/datum/:datum', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid, datum } = req.params;
        const result = await client.query(
            'DELETE FROM Anwesenheit WHERE MitgliedsID = $1 AND Datum = $2 RETURNING *;',
            [mitgliedsid, datum]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Anwesenheit nicht gefunden' });
        }
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json({ message: 'Anwesenheit erfolgreich gelöscht', anwesenheit: result.rows[0] });
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /anwesenheiten/datum/:datum
app.get('/anwesenheiten/datum/:datum', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { datum } = req.params;
        const result = await client.query(
            'SELECT a.*, m.vorname, m.nachname FROM Anwesenheit a JOIN Mitglieder m ON a.MitgliedsID = m.MitgliedsID WHERE a.Datum = $1;',
            [datum]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /anwesenheiten/mitglied/:mitgliedsid/verkaeufe
app.get('/anwesenheiten/mitglied/:mitgliedsid/verkaeufe', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid } = req.params;
        const result = await client.query(
            'SELECT * FROM Verkaeufe WHERE AnwesenheitsID IN (SELECT AnwesenheitsID FROM Anwesenheit WHERE MitgliedsID = $1);',
            [mitgliedsid]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.post('/anwesenheiten/mitglied/:mitgliedsid/verkaeufe', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid } = req.params;
        const { produktid, menge, rabatt, datum } = req.body;

        // Preis des Produkts aus der Datenbank holen
        const produktResult = await client.query(
            'SELECT Preis FROM Produkte WHERE ProduktID = $1;',
            [produktid]
        );
        if (produktResult.rowCount === 0) {
            return res.status(400).json({ error: 'Produkt nicht gefunden' });
        }
        const preis = produktResult.rows[0].preis;
        const gesamtpreis = menge * preis * (1 - (rabatt || 0) / 100);
        console.log(`Produktpreis: ${preis}, Menge: ${menge}, Rabatt: ${rabatt}, Gesamtpreis: ${gesamtpreis}`);

        // Hole die AnwesenheitsID anhand von mitgliedsid und datum
        const anwesenheitResult = await client.query(
            'SELECT AnwesenheitsID FROM Anwesenheit WHERE MitgliedsID = $1 AND Datum = $2;',
            [mitgliedsid, datum]
        );
        if (anwesenheitResult.rowCount === 0) {
            return res.status(400).json({ error: 'Anwesenheit für Mitglied und Datum nicht gefunden' });
        }
        const anwesenheitsid = anwesenheitResult.rows[0].anwesenheitsid;

        const result = await client.query(
            'INSERT INTO Verkaeufe (AnwesenheitsID, ProduktID, Menge, RabattProzent, Gesamtpreis) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
            [anwesenheitsid, produktid, menge, rabatt, gesamtpreis]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /anwesenheiten/mitglied/:mitgliedsid/datum/:datum/verkaeufe
app.get('/anwesenheiten/mitglied/:mitgliedsid/datum/:datum/verkaeufe', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid, datum } = req.params;
        const result = await client.query(
            'SELECT * FROM Verkaeufe WHERE AnwesenheitsID IN (SELECT AnwesenheitsID FROM Anwesenheit WHERE MitgliedsID = $1 AND Datum = $2);',
            [mitgliedsid, datum]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /anwesenheiten/mitglied/:mitgliedsid/datum/:datum/verkaeufe/kosten
app.get('/anwesenheiten/mitglied/:mitgliedsid/datum/:datum/verkaeufe/kosten', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid, datum } = req.params;
        // Summiere den Gesamtpreis aller Verkäufe des Mitglieds an diesem Tag direkt in der DB
        const verkaufResult = await client.query(
            `SELECT COALESCE(SUM(gesamtpreis), 0) AS kosten
             FROM verkaeufe
             WHERE anwesenheitsid IN (
            SELECT anwesenheitsid FROM anwesenheit WHERE mitgliedsid = $1 AND datum = $2
             );`,
            [mitgliedsid, datum]
        );
        console.log(INF_QUERY_RESULT(verkaufResult.rows.length));
        const kostenVerkauf = verkaufResult.rows[0].kosten;
        // Schießgebühr aus Anwesenheit holen
        const gebuehrResult = await client.query(
            `SELECT schiessgebuehr, mitgliedsid FROM anwesenheit WHERE mitgliedsid = $1 AND datum = $2;`,
            [mitgliedsid, datum]
        );
        console.log(INF_QUERY_RESULT(gebuehrResult.rows.length));
        let kostenGebuehr = 0;
        let istGast = false;
        if (gebuehrResult.rowCount > 0) {
            kostenGebuehr = gebuehrResult.rows[0].schiessgebuehr || 0;
            // Prüfen, ob Mitglied ein Gast ist
            const mitgliedResult = await client.query(
            `SELECT rolle FROM mitglieder WHERE mitgliedsid = $1;`,
            [gebuehrResult.rows[0].mitgliedsid]
            );
            if (mitgliedResult.rowCount > 0 && mitgliedResult.rows[0].rolle === 'GAST') {
            istGast = true;
            }
        }
        // Kalibergebühren summieren
        const kaliberResult = await client.query(
            `SELECT k.gebuehrmitglied, k.gebuehrgastzuschlag
             FROM anwesenheit_kaliber ak
             JOIN kalibergebuehren k ON ak.kaliberid = k.kaliberid
             WHERE ak.anwesenheitsid IN (
            SELECT anwesenheitsid FROM anwesenheit WHERE mitgliedsid = $1 AND datum = $2
             );`,
            [mitgliedsid, datum]
        );
        console.log(INF_QUERY_RESULT(kaliberResult.rows.length));
        let kostenKaliber = 0;
        if (kaliberResult.rows.length > 0) {
            if (istGast) {
            kostenKaliber = Math.max(
                ...kaliberResult.rows.map(row => Number(row.gebuehrmitglied) + Number(row.gebuehrgastzuschlag))
            );
            } else {
            kostenKaliber = Math.max(
                ...kaliberResult.rows.map(row => Number(row.gebuehrmitglied))
            );
            }
        }
        console.log(`Kosten Verkauf: ${kostenVerkauf}, Kosten Gebühr: ${kostenGebuehr}, Kosten Kaliber: ${kostenKaliber}`);
        const kosten = Number(kostenVerkauf) + Number(kostenGebuehr) + kostenKaliber;
        res.json({ kosten });
        return;
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.post('/anwesenheiten/mitglied/:mitgliedsid/datum/:datum/kaliber', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid, datum } = req.params;
        const { kaliberid } = req.body;
        // Hole die AnwesenheitsID anhand von mitgliedsid und datum
        const anwesenheitResult = await client.query(
            'SELECT AnwesenheitsID FROM Anwesenheit WHERE MitgliedsID = $1 AND Datum = $2;',
            [mitgliedsid, datum]
        );
        if (anwesenheitResult.rowCount === 0) {
            return res.status(400).json({ error: 'Anwesenheit für Mitglied und Datum nicht gefunden' });
        }
        const anwesenheitsid = anwesenheitResult.rows[0].anwesenheitsid;
        // Prüfen, ob das Kaliber bereits für diese Anwesenheit existiert
        const checkResult = await client.query(
            'SELECT * FROM Anwesenheit_Kaliber WHERE AnwesenheitsID = $1 AND KaliberID = $2;',
            [anwesenheitsid, kaliberid]
        );
        if (checkResult.rowCount > 0) {
            return res.status(400).json({ error: 'Kaliber bereits für diese Anwesenheit erfasst' });
        }
        // Prüfen, ob das Kaliber existiert
        const kaliberResult = await client.query(
            'SELECT * FROM KaliberGebuehren WHERE KaliberID = $1;',
            [kaliberid]
        );
        if (kaliberResult.rowCount === 0) {
            return res.status(400).json({ error: 'Kaliber nicht gefunden' });
        }
        const result = await client.query(
            'INSERT INTO Anwesenheit_Kaliber (AnwesenheitsID, KaliberID) VALUES ($1, $2) RETURNING *;',
            [anwesenheitsid, kaliberid]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /kaliber
app.get('/kaliber', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const result = await client.query(
            'SELECT KaliberID, Bezeichnung FROM KaliberGebuehren;'
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.post('/kaliber', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { bezeichnung, gebuehrMitglied, gebuehrGastZuschlag } = req.body;
        const result = await client.query(
            'INSERT INTO KaliberGebuehren (Bezeichnung, GebuehrMitglied, GebuehrGastZuschlag) VALUES ($1, $2, $3) RETURNING *;',
            [bezeichnung, gebuehrMitglied, gebuehrGastZuschlag]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /kaliber/:id
app.get('/kaliber/:id', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { id } = req.params;
        const result = await client.query(
            'SELECT * FROM KaliberGebuehren WHERE KaliberID = $1;',
            [id]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.put('/kaliber/:id', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { id } = req.params;
        const { bezeichnung, gebuehrMitglied, gebuehrGastZuschlag } = req.body;
        const result = await client.query(
            'UPDATE KaliberGebuehren SET Bezeichnung = $1, GebuehrMitglied = $2, GebuehrGastZuschlag = $3 WHERE KaliberID = $4 RETURNING *;',
            [bezeichnung, gebuehrMitglied, gebuehrGastZuschlag, id]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

/*
// Route: /berichte/taeglich
app.get('/berichte/taeglich', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const result = await client.query(
            'SELECT * FROM Tagesabschluss;'
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});
app.get('/berichte/taeglich/:datum', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { datum } = req.params;
        const result = await client.query(
            'SELECT * FROM Tagesabschluss WHERE AbschlussDatum = $1;',
            [datum]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Tagesabschluss nicht gefunden' });
        }
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});*/

// Route: /theke/:year/:month/:day/abschluss
app.post('/theke/:year/:month/:day/abschluss', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { year, month, day } = req.params;
        const datum = `${year}-${month}-${day}`;
        const {  } = req.body;
        //erstellt durch ist der eingeloggte Nutzer
        const erstelltDurch = req.session.user.benutzername;

        // Prüfen, ob der Tag bereits abgeschlossen ist
        const checkResult = await client.query(
            'SELECT * FROM Tagesabschluss WHERE AbschlussDatum = $1;',
            [datum]
        );
        if (checkResult.rowCount > 0) {
            return res.status(400).json({ error: 'Tag bereits abgeschlossen' });
        }

        // Abschlussbericht erstellen
        const result = await client.query(
            'INSERT INTO Tagesabschluss (AbschlussDatum, ErstelltDurch ) VALUES ($1, $2) RETURNING *;',
            [datum, erstelltDurch]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));

        //Verkäufe dem Abschluss zuordnen in Tabelle Tagesabschluss_Verkaeufe

        const tagesabschlussId = result.rows[0].tagesabschlussid;
        const verkaufResult = await client.query(
            'INSERT INTO Tagesabschluss_Verkaeufe (TagesabschlussID, VerkaufID) ' +
            'SELECT $1, VerkaufID FROM Verkaeufe WHERE Datum = $2 RETURNING *;',
            [tagesabschlussId, datum]
        );
        console.log(INF_QUERY_RESULT(verkaufResult.rows.length));
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /verkaeufe
app.get('/verkaeufe', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const result = await client.query(
            'SELECT VerkaufID, AnwesenheitsID, ProduktID FROM Verkaeufe;'
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

/*app.post('/verkaeufe', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { mitgliedsid, datum, produktid, menge, rabatt } = req.body;

        // Hole die AnwesenheitsID anhand von mitgliedsid und datum
        const anwesenheitResult = await client.query(
            'SELECT AnwesenheitsID FROM Anwesenheit WHERE MitgliedsID = $1 AND Datum = $2;',
            [mitgliedsid, datum]
        );
        if (anwesenheitResult.rowCount === 0) {
            return res.status(400).json({ error: 'Anwesenheit für Mitglied und Datum nicht gefunden' });
        }
        const anwesenheitsid = anwesenheitResult.rows[0].anwesenheitsid;

        const gesamtpreis = menge * (1 - rabatt / 100) * (await client.query(
            'SELECT Preis FROM Produkte WHERE ProduktID = $1;',
            [produktid]
        )).rows[0].preis;
        const result = await client.query(
            'INSERT INTO Verkaeufe (AnwesenheitsID, ProduktID, Menge, RabattProzent, Gesamtpreis) VALUES ($1, $2, $3, $4, $5) RETURNING *;',
            [anwesenheitsid, produktid, menge, rabatt, gesamtpreis]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});*/

// Route: /verkaeufe/:verkaufsid
app.get('/verkaeufe/:verkaufsid', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { verkaufsid } = req.params;
        const result = await client.query(
            'SELECT * FROM Verkaeufe WHERE AnwesenheitsID IN (SELECT AnwesenheitsID FROM Anwesenheit WHERE VerkaufID = $1);',
            [verkaufsid]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

app.put('/verkaeufe/:verkaufsid', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { verkaufsid } = req.params;
        const { produktid, menge, rabatt } = req.body;
        const gesamtpreis = menge * (1 - rabatt / 100) * (await client.query(
            'SELECT Preis FROM Produkte WHERE ProduktID = $1;',
            [produktid]
        )).rows[0].preis;
        const result = await client.query(
            'UPDATE Verkaeufe SET ProduktID = $1, Menge = $2, RabattProzent = $3, Gesamtpreis = $4 WHERE VerkaufID = $5 RETURNING *;',
            [produktid, menge, rabatt, gesamtpreis, verkaufsid]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows[0]);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
});

// Route: /produkte/type/:type
app.get('/produkte/type/:type', requireLogin, async (req, res) => {
    const client = await dbconnect();
    try {
        const { type } = req.params;
        const result = await client.query(
            'SELECT * FROM Produkte WHERE Kategorie = $1;',
            [type]
        );
        console.log(INF_QUERY_RESULT(result.rows.length));
        res.json(result.rows);
    } catch (err) {
        console.error(ERR_QUERY, err.message);
        res.status(500).json({ error: 'Datenbankfehler' });
    } finally {
        client.release();
    }
}
);