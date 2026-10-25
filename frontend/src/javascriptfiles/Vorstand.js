const vorstand = {
    loadTab: async function(tabName) {
        const html = await fetch(`subseiten/${tabName}.html`).then(r => r.text());
        document.getElementById('tab-content').innerHTML = html;
        this.loadCSS(`subseiten/${tabName}.css`);

        // nachladen je nach Tab
        if (tabName === 'mitglieder') this.initMitglieder();
    },

    loadCSS: function(file) {
        let old = document.getElementById('dynamic-css');
        if (old) old.remove();

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = file;
        link.id = 'dynamic-css';
        document.head.appendChild(link);
    },

    initMitglieder: function() {
        console.log("Mitgliederansicht geladen");
    },

    addMitglied: function(event) {
        event.preventDefault();
        const name = document.getElementById("mitgliedName").value;
        const vorname = document.getElementById("mitgliedVorname").value;

        const row = document.createElement("tr");
        row.innerHTML = `<td>${name}</td><td>${vorname}</td>`;
        document.querySelector("#mitgliederTabelle tbody").appendChild(row);

        event.target.reset()},

    addDisziplin: function() {
        const input = document.getElementById("neueDisziplin");
        const li = document.createElement("li");
        li.textContent = input.value;
        document.getElementById("disziplinListe").appendChild(li);
        input.value = "";
    }
};
