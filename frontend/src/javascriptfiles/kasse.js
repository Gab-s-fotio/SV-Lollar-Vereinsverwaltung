const thekeBody = document.getElementById('thekeBody');
const produkte = {
    Drink: [],
    Snack: [],
    Ammunition: [],
    Penalty: []
};

let currentAddCategory = null;
let currentRow = null;

// Statt Dropdown: Liste + Button zum Hinzufügen
function createListWithAddButton(category, rowId) {
    const container = document.createElement('div');

    const ul = document.createElement('ul');
    ul.classList.add('item-list');
    ul.dataset.category = category;

    container.appendChild(ul);

    const btn = document.createElement('button');
    btn.textContent = '+';
    btn.title = `Neues ${category} hinzufügen`;
    btn.onclick = () => openAddItemDialog(category, rowId);
    container.appendChild(btn);

    return container;
}

function createTdWithList(category, rowId) {
    const td = document.createElement('td');
    td.appendChild(createListWithAddButton(category, rowId));
    td.classList.add(`${category}-cell`);
    return td;
}

// Modal für Item-Auswahl
async function openAddItemDialog(category, rowId) {
    currentAddCategory = category;
    currentRow = document.getElementById(`row-${rowId}`);

    let options = [];

    switch (category) {
        case 'disziplinen':
            options = await loadAvailableKaliber();
            break;
        case 'getraenke':
            options = produkte.Drink.map(p => p.name);
            break;
        case 'snacks':
            options = produkte.Snack.map(p => p.name);
            break;
        case 'munitionen':
            options = produkte.Ammunition.map(p => p.name);
            break;
        case 'sonstiges':
            options = produkte.Penalty.map(p => p.name);
            break;
        default:
            options = [];
    }

    const modal = document.getElementById('itemSelectionModal');
    const select = document.getElementById('itemSelect');
    select.innerHTML = '';

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    });

    modal.style.display = 'flex';
}

async function confirmAddItem() {
    const select = document.getElementById('itemSelect');
    const quantityInput = document.getElementById('itemQuantity');
    const freeToggle = document.getElementById('freeToggle');

    const item = select.value;
    const quantity = parseInt(quantityInput.value);
    const rabatt = freeToggle.checked ? 100 : 0;

    if (!item || !currentAddCategory || !currentRow || isNaN(quantity) || quantity < 1) return;

    const td = currentRow.querySelector(`.${currentAddCategory}-cell`);
    const ul = td.querySelector('ul.item-list');

    // Prüfen, ob Item schon drin ist
    const existingItems = Array.from(ul.children).map(li => li.textContent);
    const existing = existingItems.find(text => text.startsWith(item));
    if (existing) return;

    if (currentAddCategory === 'munitionen' && currentRow?.dataset?.mitgliedsid) {
        const mitgliedsid = currentRow.dataset.mitgliedsid;
        const datum = new Date().toISOString().split('T')[0];
        await postKaliberForMember(mitgliedsid, datum, item);
    }

    if (currentRow?.dataset?.mitgliedsid) {
        const mitgliedsid = currentRow.dataset.mitgliedsid;
        const datum = new Date().toISOString().split('T')[0];

        let produkt;
        switch (currentAddCategory) {
            case 'getraenke':
                produkt = produkte.Drink.find(p => p.name === item);
                break;
            case 'snacks':
                produkt = produkte.Snack.find(p => p.name === item);
                break;
            case 'munitionen':
                produkt = produkte.Ammunition.find(p => p.name === item);
                break;
            case 'sonstiges':
                produkt = produkte.Penalty.find(p => p.name === item);
                break;
        }

        if (produkt?.produktid) {
            for (let i = 0; i < quantity; i++) {
                await postVerkaufForMember(mitgliedsid, rabatt, datum, produkt.produktid);
            }
        }
    }

    const li = document.createElement('li');
    li.textContent = `${item} × ${quantity}` + (rabatt === 100 ? ' (frei)' : '');
    ul.appendChild(li);

    closeModal();
}


window.openModal = function (title) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalOverlay').style.display = 'flex';
};

function closeModal() {
    const addPersonModal = document.getElementById('addPersonModal');
    const itemSelectionModal = document.getElementById('itemSelectionModal');
    const personChoiceModal = document.getElementById('personChoiceModal');

    if (personChoiceModal) personChoiceModal.style.display = 'none';
    if (addPersonModal) addPersonModal.style.display = 'none';
    if (itemSelectionModal) {
        itemSelectionModal.style.display = 'none';
        currentAddCategory = null;
        currentRow = null;
    }
}

function openAddPersonDialog() {
    document.getElementById('personChoiceModal').style.display = 'flex';
}

// Fügt Person hinzu
function addPerson(type) {
    closeModal();

    if (type === 'mitglied') {
        fetchMembersFromDB().then(() => {
            document.getElementById('addPersonModal').style.display = 'flex';
        });
    } else {
        const name = prompt('Name des Gasts:');
        if (name) {
            addRow(name);
        }
    }
}

function choosePersonType(type) {
    closeModal();

    if (type === 'mitglied') {
        fetchMembersFromDB().then(() => {
            document.getElementById('addPersonModal').style.display = 'flex';
        });
    } else if (type === 'gast') {
        const name = prompt('Name des Gasts:');
        if (name) {
            addRow(name);
        }
    }
}

window.addEventListener('click', (e) => {
    const itemModal = document.getElementById('itemSelectionModal');
    const personModal = document.getElementById('addPersonModal');

    if (e.target === itemModal) {
        closeModal();
    }
    if (e.target === personModal) {
        closeModal();
    }
});


async function loadBarDataFromDB() {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const response = await fetch(domain + 'anwesenheiten/datum/' + today, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error("Anwesenheiten konnten nicht geladen werden");
        }

        const data = await response.json();

        data.forEach(entry => {
            const name = `${entry.vorname} ${entry.nachname}`;
            addRow(name, entry.schiessgebuehr, entry.mitgliedsid);
        });

    } catch (error) {
        console.error("Fehler beim Laden der Anwesenheiten:", error);
        alert("Fehler beim Laden der Anwesenheiten.");
    }
}

async function fetchMembersFromDB() {
    try {
        const response = await fetch(domain + 'mitglieder', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error("Fehler beim Laden der Mitglieder");
        }

        const members = await response.json();

        const select = document.getElementById('memberSelect');
        select.innerHTML = '';

        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.mitgliedsid;
            option.textContent = `${member.mitgliedsid} ${member.vorname} ${member.nachname}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Mitglieder konnten nicht geladen werden:", error);
        alert("Fehler beim Laden der Mitglieder.");
    }
}

async function addRow(personName, initialAmount = 0, mitgliedsid = null) {
    const tr = document.createElement('tr');
    const rowId = thekeBody.children.length + 1;
    tr.id = `row-${rowId}`;

    const tdName = document.createElement('td');
    tdName.textContent = personName;
    tr.appendChild(tdName);

    tr.appendChild(createTdWithList('disziplinen', rowId));
    tr.appendChild(createTdWithList('munitionen', rowId));
    tr.appendChild(createTdWithList('getraenke', rowId));
    tr.appendChild(createTdWithList('snacks', rowId));
    tr.appendChild(createTdWithList('sonstiges', rowId));

    const tdAmount = document.createElement('td');
    tr.appendChild(tdAmount);

    thekeBody.appendChild(tr);

    if (mitgliedsid) {
        tr.dataset.mitgliedsid = mitgliedsid;

        // Verkäufe nachladen
        const today = new Date().toISOString().split('T')[0];
        const verkaeufe = await loadVerkaeufeForMember(mitgliedsid, today);

        verkaeufe.forEach(produkt => {
            const typ = produkt.typ.toLowerCase(); // z. B. 'Drink' → 'drink'
            const map = {
                drink: 'getraenke',
                snack: 'snacks',
                ammunition: 'munitionen',
                penalty: 'sonstiges'
            };
            const category = map[typ];
            if (!category) return;

            const td = tr.querySelector(`.${category}-cell`);
            if (!td) return;

            const ul = td.querySelector('ul.item-list');
            const exists = Array.from(ul.children).some(li => li.textContent === produkt.name);
            if (!exists) {
                const li = document.createElement('li');
                li.textContent = produkt.name;
                ul.appendChild(li);
            }
        });

        // Kaliber laden (Munition vom Typ Kaliber)
        const kaliber = await loadKaliberForMember(mitgliedsid, today);

        kaliber.forEach(entry => {
            const td = tr.querySelector('.munitionen-cell');
            if (!td) return;
            const ul = td.querySelector('ul.item-list');

            const exists = Array.from(ul.children).some(li => li.textContent === entry.name);
            if (!exists) {
                const li = document.createElement('li');
                li.textContent = entry.name;
                ul.appendChild(li);
            }
        });

    }
}

// POST anwesenheiten
async function postAnwesenheit(mitgliedsid, datum, schiessgebuehr = 0) {
    try {
        const response = await fetch(domain + 'anwesenheiten', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mitgliedsid,
                datum,
                schiessgebuehr
            })
        });

        if (!response.ok) {
            throw new Error("Fehler beim Eintragen der Anwesenheit");
        }
    } catch (error) {
        console.error("Anwesenheit konnte nicht gespeichert werden:", error);
        alert("Fehler beim Speichern der Anwesenheit.");
    }
}

async function confirmAddMember() {
    const select = document.getElementById('memberSelect');
    const mitgliedsid = select.value;
    const selectedOption = select.selectedOptions[0];
    const name = selectedOption ? selectedOption.textContent : "Unbekannt";

    if (mitgliedsid && name) {
        const today = new Date().toISOString().split('T')[0];

        try {
            const response = await postAnwesenheit(mitgliedsid, today);

            if (response.ok) {
                addRow(name, 0, mitgliedsid);
            } else {
                console.error("Anwesenheit konnte nicht hinzugefügt werden:", response.status);
                alert("Fehler beim Hinzufügen der Anwesenheit.");
            }
        } catch (error) {
            console.error("Fehler bei der Netzwerkverbindung:", error);
            alert("Fehler beim Hinzufügen");
        }
    }

    closeModal();
}

// Initialisierung
window.addEventListener('DOMContentLoaded', async () => {
    await loadAllProducts();
    loadBarDataFromDB();
});

async function fetchProdukteByType(type) {
    try {
        const response = await fetch(`https://localhost:3002/produkte/type/${type}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Produkte vom Typ ${type} konnten nicht geladen werden`);
        }

        const produkte = await response.json();
        return produkte.map(p => p.name); // oder p.bezeichnung, je nachdem wie das Backend die Daten liefert
    } catch (error) {
        console.error("Fehler beim Laden der Produkte:", error);
        alert("Produkte konnten nicht geladen werden.");
        return [];
    }
}

async function loadVerkaeufeForMember(mitgliedsid, datum) {
    try {
        const response = await fetch(`${domain}/anwesenheiten/mitglied/${mitgliedsid}/datum/${datum}/verkaeufe`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error("Fehler beim Laden der Verkäufe");
        }

        const data = await response.json(); // z.B. [{name: 'Cola', typ: 'Drink'}, ...]

        return data;
    } catch (error) {
        console.error("Verkäufe konnten nicht geladen werden:", error);
        return [];
    }
}

async function loadKaliberForMember(mitgliedsid, datum) {
    try {
        const response = await fetch(`${domain}anwesenheiten/mitglied/${mitgliedsid}/datum/${datum}/kaliber`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error("Fehler beim Laden der Kaliber");
        }

        const data = await response.json(); // z.B. [{name: '.177'}, {name: '.22lr'}]
        return data;
    } catch (error) {
        console.error("Kaliber konnten nicht geladen werden:", error);
        return [];
    }
}

async function loadAvailableKaliber() {
    try {
        const response = await fetch(`${domain}kaliber`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error("Fehler beim Laden der verfügbaren Kaliber");
        }

        const data = await response.json(); // z.B. [{name: '.177', preis: 1.50}, ...]
        return data.map(k => k.name); // Nur Namen extrahieren
    } catch (error) {
        console.error("Kaliberliste konnte nicht geladen werden:", error);
        return [];
    }
}

async function postKaliberForMember(mitgliedsid, datum, name) {
    try {
        const response = await fetch(`${domain}anwesenheiten/mitglied/${mitgliedsid}/datum/${datum}/kaliber`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            throw new Error("Fehler beim Hinzufügen des Kalibers");
        }
    } catch (error) {
        console.error("Kaliber konnte nicht gespeichert werden:", error);
        alert("Fehler beim Speichern des Kalibers.");
    }
}

async function loadAllProducts() {
    const types = ['Drink', 'Snack', 'Ammunition', 'Penalty'];

    for (const type of types) {
        try {
            const response = await fetch(`${domain}produkte/type/${type}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) throw new Error();

            const data = await response.json();
            produkte[type] = data; // z.B. [{ produktid: 1, name: 'Cola', preis: 1.50 }]
        } catch {
            console.error(`Fehler beim Laden der Produkte vom Typ ${type}`);
        }
    }
}

async function postVerkaufForMember(mitgliedsid, rabatt, datum, produktid, gesamtpreis) {
    try {
        const response = await fetch(`${domain}anwesenheiten/mitglied/${mitgliedsid}/verkaeufe`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                produktid,
                rabatt,
                menge: 1,
                datum
            })
        });

        if (!response.ok) {
            throw new Error("Fehler beim Speichern des Verkaufs");
        }
    } catch (error) {
        console.error("Verkauf konnte nicht gespeichert werden:", error);
        alert("Fehler beim Speichern des Produkts.");
    }
}

//get anwesenheiten/datum/aktuellesdatum
// mitgliedsid , vorname, nachname ,...
//post anwesenheiten
//json mitgliedsid, datum, schießgebuehr

//YYYY-MM-DD

//GET https://localhost:3002/produkte/type/Drink
//Drink, Snack, Ammunition, Penalty