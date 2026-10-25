var domain= "https://localhost:3002/";

document.addEventListener("DOMContentLoaded", () => {
    // Nur prüfen, ob Login noch gültig ist, wenn man sich auf "app.html" befindet
    if (window.location.pathname.includes("willkommen.html")) {
        fetch(domain + 'login', {
            method: 'GET',
            credentials: 'include'
        })
            .then(response => {
                console.log('response', response);
                if (!response.ok) {
                    throw new Error('Nicht eingeloggt');
                } else console.log("eingelogt");
                //return response.json();
            })
            //.then(data => {
            //    console.log("Benutzer ist eingeloggt:", data);
            //    // Optional: Benutzername anzeigen etc.
            //})
            .catch(error => {
                console.warn("Nicht eingeloggt oder Session abgelaufen:", error);
                window.location.href = "index.html"; // Zurück zur Loginseite
            });
    }
});

document.addEventListener("DOMContentLoaded", () => {
//lade ein neues Fernster beim  Drücken auf Vorstand
    window.loadPage = function (page) {
        const content = document.getElementById('mainContent');

        if (page === 'vorstand') {
            content.innerHTML = `
            <h1>Vorstand-Bereich</h1>
            <div class="vorstand-menu">
                <button onclick="loadSubPage('mitglieder')">Mitglieder</button>
                <button onclick="loadSubPage('theken')">Theken</button>
                <button onclick="loadSubPage('disziplin')">Disziplin</button>
                <button onclick="loadSubPage('Tagesbericht')">Tagesbericht</button>
                <button onclick="loadSubPage('Bedürfnissverwaltung')">Bedürfnissverwaltung</button>
            </div>
            <div id="subContent"></div>
        `;
        } else if (page === 'kasse') {
            window.location.href = "Kasse.html";
        } else if (page === 'Vorstand') {
            window.location.href = "Vorstand.html";
        } else if (page === 'Tagesabschluss') {
            window.location.href = "Tagesabschluss.html";
        } else {
            content.innerHTML = `<h1>Willkommen</h1><p>Wähle einen Menüpunkt links.</p>`;
        }
    };
// lade ein neues Fernster für ein vorhandenes Thema im Vorstand
    window.loadSubPage = async function (section) {
        const sub = document.getElementById('subContent');

        if (section === 'mitglieder') {
            try {
                const response = await fetch('Mitglieder.html');
                const html = await response.text();
                sub.innerHTML = html;
            } catch (err) {
                sub.innerHTML = '<p>Fehler beim Laden der Mitgliederverwaltung.</p>';
            }
            return;
        }
        const content = {
            theken: `
            <h2>Theken</h2>
            <p>Plane und verwalte Thekendienste.</p>
        `,
            disziplin: `
            <h2>Disziplin</h2>
            <p>Erstelle oder ändere Disziplinen.</p>
        `,
            tagesbericht: `
            <h2>Tagesbericht</h2>
            <p>Berichte vom Tagesablauf ansehen oder speichern.</p>
        `
        };

        sub.innerHTML = content[section] || '<p>Inhalt nicht gefunden.</p>';
    };


    window.handleLogin = async function (event) {
        event.preventDefault();

        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        try {
            const response = await fetch(domain+'login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username: user, password: pass })
            });

            if (!response.ok) {
                throw new Error('Login fehlgeschlagen');
            }

            const data = await response.json();
            console.log('Login erfolgreich:', data);

            window.location.href = "willkommen.html";

        } catch (error) {
            console.error('Fehler:', error);
            document.getElementById('loginError').style.display = 'block';
        }
    };
});

function showMemberList() {
    document.getElementById('welcomePage').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="kassendienst-header">
        <h1>Mitgliederliste</h1>
        <button class="add-member-button" onclick="toggleMemberForm()">+</button>
      </div>
      <table class="members-table" border="1" cellpadding="10">
        <thead>
          <tr><th>Name</th><th>Vorname</th><th>Geburtsdatum</th><th>Disziplin</th><th>Rolle</th></tr>
        </thead>
        <tbody id="members-body"></tbody>
      </table>
      <form id="member-form" style="display:none;" onsubmit="submitMemberForm(event)">
        <label>Name:</label><input type="text" id="name" required />
        <label>Vorname:</label><input type="text" id="vorname" required />
        <label>Geburtsdatum:</label><input type="date" id="geburtsdatum" required />
        <label>Disziplin:</label><input type="text" id="disziplin" required />
        <label>Rolle:</label>
        <select id="rolle">
          <option value="Mitglied">Mitglied</option>
          <option value="Kein Mitglied">Kein Mitglied</option>
        </select>
        <button type="submit">Speichern</button>
      </form>
    `;

    // Mitglieder vom Server laden
    fetch(domain + 'api/mitglieder', {
        method: 'GET',
        credentials: 'include'
    })
        .then(res => res.json())
        .then(mitglieder => {
            const tbody = document.getElementById('members-body');
            mitglieder.forEach(m => {
                const row = document.createElement('tr');
                row.innerHTML = `
                <td>${m.name}</td>
                <td>${m.vorname}</td>
                <td>${m.geburtsdatum}</td>
                <td>${m.disziplin}</td>
                <td>${m.rolle}</td>
            `;
                tbody.appendChild(row);
            });
        })
        .catch(err => {
            console.error("Fehler beim Laden der Mitglieder:", err);
        });
}

function toggleMemberForm() {
    const form = document.getElementById('member-form');
    form.style.display = form.style.display === 'block' ? 'none' : 'block';
}

function submitMemberForm(event) {
    event.preventDefault();

    const mitglied = {
        name: document.getElementById('name').value,
        vorname: document.getElementById('vorname').value,
        geburtsdatum: document.getElementById('geburtsdatum').value,
        disziplin: document.getElementById('disziplin').value,
        rolle: document.getElementById('rolle').value
    };

    fetch(domain + 'api/mitglieder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(mitglied)
    })
        .then(res => res.json())
        .then(data => {
            console.log("Mitglied gespeichert:", data);
            // Neue Zeile in die Tabelle einfügen
            const tbody = document.getElementById('members-body');
            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${mitglied.name}</td>
            <td>${mitglied.vorname}</td>
            <td>${mitglied.geburtsdatum}</td>
            <td>${mitglied.disziplin}</td>
            <td>${mitglied.rolle}</td>
        `;
            tbody.appendChild(row);

            // Formular zurücksetzen und ausblenden
            document.getElementById('member-form').reset();
            toggleMemberForm();
        })
        .catch(err => {
            console.error("Fehler beim Speichern des Mitglieds:", err);
        });
}
