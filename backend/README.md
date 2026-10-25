# 🔐 SV Lollar Verwaltungssystem (Express.js Backend)

This is a secure backend built with Express.js for managing members, guests, sales, and bar shifts for SV Lollar. It uses PostgreSQL, session handling, HTTPS, and a role-based user system.

---

## 📦 Prerequisites

Make sure the following are installed:

- **[Node.js](https://nodejs.org/en)** (empfohlen: ≥ 18.x)
- **[npm](https://www.npmjs.com/)** (Node Package Manager)
- **[PostgreSQL](https://www.postgresql.org/)** (mit passender Datenbank & Tabellenstruktur)
- **[OpenSSL](https://slproweb.com/products/Win32OpenSSL.html)** (für lokale HTTPS-Zertifikate)

---

## 📁 Project Structure

```go
.
├── cert/
│   ├── cert.pem         // SSL certificate
│   └── key.pem          // SSL key
├── server.js            // Main Express Server
├── package.json
├── .env                 // Environment variables
└── USER.http            // Test-Data for HTTP-Requests

```
---
# 🛠️ Installation
1. **Clone the repository or download the project**
```bash
git clone <dein-repo-url>
cd <projektordner>
```
2. **Install dependencies**
```bash
npm install
```

3. **Generate SSL certificates (for local development)**

```ps
@"
[ req ]
default_bits       = 2048
default_md         = sha256
prompt             = yes
distinguished_name = req_distinguished_name
x509_extensions    = v3_req

[ req_distinguished_name ]
countryName                     = Country Name (2 letter code)
countryName_default             = DE
stateOrProvinceName             = State or Province Name (full name)
stateOrProvinceName_default     = Hessen
localityName                    = Locality Name (eg, city)
localityName_default            = Giessen
organizationName                = Organization Name (eg, company)
organizationName_default        = SV Lollar
commonName                      = Common Name (e.g. server FQDN or YOUR name)
commonName_default              = localhost

[ v3_req ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = localhost

"@ | Set-Content "C:\Program Files\OpenSSL-Win64\bin\openssl.cfg"
```
```bash
mkdir cert
"C:\Program Files\OpenSSL-Win64\bin\openssl.exe" req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -config "C:\Program Files\OpenSSL-Win64\bin\openssl.cfg"
```
📌 Do not set a passphrase. The prompts can be skipped or filled freely.

4. **Create the .env file**

```env
DB_USER=svlollaruser
DB_HOST=localhost
DB_DATABASE=svlollardata
DB_PASSWORD=<dein_db_passwort>
DB_PORT=5433

SESSION_SECRET=<zufaelliger_langer_string>

SSL_KEY_PATH=cert/key.pem
SSL_CERT_PATH=cert/cert.pem

PORT=3000
```
🔐 Never commit your .env file to Git!

---
# 🚀 Starting the Server
Start the server with:

```bash
node server.js
```
Or with auto-restart on file changes (requires nodemon):

```bash
npm install -g nodemon
nodemon server.js
```
The server runs at: https://localhost:3000

---
# 🔐 Login & Session Handling
All routes (except /login, /logout, /session-debug) are protected.

Sessions are managed using secure HTTPS cookies.

---
# 📬 Example Requests (REST Client or Postman)
See USER.http for ready-made test requests like:

```http
### Login
POST https://localhost:3000/login
Content-Type: application/json

{
"benutzername": "admin",
"passwort": "<dein_admin_passwort>"
}
```