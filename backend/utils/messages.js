// messages.js
const icon_no = '❌';
const icon_ok = '✅';
const icon_search = '🔍';
const icon_lock = '🔐';
const icon_query = '📊';
const icon_info = 'ℹ️';

module.exports = {
    icon_ok,
    icon_no,
    icon_search,
    icon_lock,
    icon_info,
    icon_query,

    ERR_DB: `${icon_no} Fehler beim Verbinden zur Datenbank`,
    ERR_QUERY: `${icon_no} Fehler bei der Abfrage:`,
    ERR_LOGIN: `${icon_no} Fehler beim Login:`,
    ERR_LOGOUT: `${icon_no} Fehler beim Logout:`,
    ERR_CREAT_USER: (benutzername) =>`${icon_no} Benutzername ${benutzername} bereits vergeben`,

    INF_SERVER_STARTET: (port) =>`🔐 HTTPS-Server läuft auf https://localhost:${port}`,
    INF_QUERY_RESULT: (count) => `${icon_query} Abfrageergebnis: ${count} Einträge gefunden`,
    INF_QUERY: (method,url) =>`${icon_search} ${method} ${url}`,
    SUC_CREATE_USER: (benutzername) =>`${icon_ok} Benutzer ${benutzername} erfolgreich erstellt`,
    SUC_LOGIN: (benutzername) =>`${icon_ok} Benutzer ${benutzername} eingeloggt`,
    SUC_LOGOUT: `${icon_ok} Benutzer ausgeloggt`,


};