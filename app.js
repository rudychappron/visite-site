// =========================
// API Secure Worker
// =========================

const API = "https://winter-bar-234b.rudychappron.workers.dev";


// =========================
// GET — Lire les magasins
// =========================
async function getMagasins() {
    const res = await fetch(`${API}/get`, {
        method: "GET",
    });

    const data = await res.json();
    console.log("Magasins :", data);
    return data;
}


// =========================
// ADD — Ajouter un magasin
// =========================
async function addMagasin(row) {
    await fetch(`${API}/add`, {
        method: "POST",
        body: JSON.stringify(row),
        headers: {
            "Content-Type": "application/json"
        }
    });
}


// =========================
// UPDATE — Modifier un magasin
// =========================
async function updateMagasin(row) {
    await fetch(`${API}/update`, {
        method: "POST",
        body: JSON.stringify(row),
        headers: {
            "Content-Type": "application/json"
        }
    });
}


// =========================
// DELETE — Supprimer un magasin
// =========================
async function deleteMagasin(code) {
    await fetch(`${API}/delete`, {
        method: "POST",
        body: JSON.stringify({ code }),
        headers: {
            "Content-Type": "application/json"
        }
    });
}


// =========================
// AFFICHER LA LISTE DES MAGASINS
// =========================
async function loadMagasins() {
    const data = await getMagasins();

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    data.forEach(row => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${row[0] || ""}</td>
            <td>${row[1] || ""}</td>
            <td>${row[2] || ""}</td>
            <td>${row[3] || ""}</td>
            <td>${row[4] || ""}</td>
            <td>${row[5] || ""}</td>
            <td>${row[6] || ""}</td>
            <td>
                <button onclick="editMagasin('${row[0]}')">✏️</button>
                <button onclick="deleteMagasin('${row[0]}')">🗑️</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}


// =========================
// EDIT — Ouvrir la page de modification
// =========================
function editMagasin(code) {
    window.location.href = `edit-magasin.html?code=${code}`;
}


// =========================
// GO ADD — Ouvrir la page d’ajout
// =========================
function goAdd() {
    window.location.href = "add-magasin.html";
}


// =========================
// AUTO-CHARGEMENT
// =========================
loadMagasins();


// =========================
// TEST API (facultatif)
// =========================
async function testAPI() {
    const magasins = await getMagasins();
    console.log("Test API OK ✔", magasins);
}

// testAPI(); // tu peux commenter cette ligne si pas besoin
