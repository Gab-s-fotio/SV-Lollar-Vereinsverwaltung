const express = require('express');
const path = require('path');
const https = require('https');
const fs = require("node:fs");
const sslOption =  {
    key: fs.readFileSync("./cert/key.pem"),
    cert: fs.readFileSync("./cert/cert.pem"),
}

const app = express();
const port = 3001;

// Middleware
app.use(express.json());

const session = require('express-session');

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true, // jetzt JA, da du HTTPS verwendest
        sameSite: 'none'
    }
}));


// Statische Dateien bereitstellen
app.use(express.static(path.join(__dirname, './src/htmlfiles')));
app.use('/javascriptfiles', express.static(path.join(__dirname, './src/javascriptfiles')));

// POST /login – Benutzername & Passwort prüfen
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
        req.session.user = { name: username };
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Login fehlgeschlagen' });
    }
});

// GET /login – Session prüfen
app.get('/login', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.status(401).json({ loggedIn: false });
    }
});

// Server starten
//app.listen(port, () => {
//    console.log(`✅ Server läuft auf http://localhost:${port}`);
//});
https.createServer(sslOption,app).listen(port, () => {
    console.log(`✅ Server läuft auf https://localhost:${port}`);})