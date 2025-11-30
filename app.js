// =========================
// API Secure Worker
// =========================

const API = "https://winter-bar-234b.rudychappron.workers.dev";


// =========================
// POSITION GPS UTILISATEUR
// =========================
window.userLat = null;
window.userLng = null;

navigator.geolocation.getCurrentPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
    },
    err => {
        console.warn("GPS refusé → distance impossible");
    }
);


// =========================
// CALCUL DE DISTANCE (km)
// =========================
function calculDistance(lat, lng) {
    if (!lat || !lng || !window.userLat || !window.userLng) return "-";

    const R = 6371;
    const dLat = (lat - window.userLat) * Math.PI / 180;
    const dLng = (lng - window.userLng) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(window.userLat * Math.PI / 180) *
        Math.cos(lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}


// =========================
// GET — Lire les magasins
// =========================
async function getMagasins() {
    const res = await fetch(`${API}/get`, {
        method: "GET",
    });

    const data = await res.json();
    return data.data; // IMPORTANT
}


// =========================
// ADD — Ajouter un magasin
// =========================
async function addMagasin(row) {
    await fetch(`${API}/add`, {
        method: "POST",
        body: JSON.stringify(row),
        headers: { "Content-Type": "application/json" }
    });
}


// =========================
// UPDATE — Modifier un magasin
// =========================
async function updateMagasin(row) {
    await fetch(`${API}/update`, {
        method: "POST",
        body: JSON.stringify(row),
        headers: { "Content-Type": "application/json" }
    });
}


// =========================
// DELETE — Supprimer un magasin
// =========================
async function deleteMagasin(code) {
    await fetch(`${API}/delete`, {
        method: "POST",
        body: JSON.stringify({ code }),
        headers: { "Content-Type": "application/json" }
    });

    loadMagasins();
}


// =========================
// AFFICHAGE DU TABLEAU
// =========================
async function loadMagasins() {
    const magasins = await getMagasins();
    if (!magasins) return;

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    magasins.slice(1).forEach(row => {

        // Correspondance EXACTE avec ton Google Sheet :
        const code        = row[0];   // Col A
        const fait        = row[1];   // Col B
        const nomComplet  = row[2];   // Col C
        const type        = row[3];   // Col D
        const adresse     = row[5];   // Col F
        const cp          = row[6];   // Col G
        const ville       = row[7];   // Col H
        const lat         = row[11];  // Col L
        const lng         = row[12];  // Col M

        const adresseComplete = `${adresse}, ${cp} ${ville}`;
        const distance = calculDistance(lat, lng);

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${code}</td>
            <td>${fait ? "✔️" : ""}</td>
            <td>${nomComplet}</td>
            <td>${type}</td>
            <td>${adresseComplete}</td>
            <td>${distance}</td>
            <td>
                <button class="btn-edit" onclick="editMagasin('${code}')">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-del" onclick="deleteMagasin('${code}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}


// =========================
// NAVIGATION
// =========================
function editMagasin(code) {
    window.location.href = `edit-magasin.html?code=${code}`;
}

function goAdd() {
    window.location.href = "add-magasin.html";
}


// =========================
// CHARGEMENT AUTO
// =========================
loadMagasins();
