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

    const R = 6371; // rayon Terre
    const dLat = (lat - window.userLat) * Math.PI / 180;
    const dLng = (lng - window.userLng) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(window.userLat * Math.PI / 180) *
        Math.cos(lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
}


// =========================
// GET — Lire les magasins
// =========================
async function getMagasins() {
    const res = await fetch(`${API}/get`, {
        method: "GET",
    });

    const data = await res.json();
    console.log("Magasins :", data);
    return data.data; // IMPORTANT : la DATA est dans .data
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

    loadMagasins();
}


// =========================
// RENDRE LA TABLE
// =========================
async function loadMagasins() {
    const magasins = await getMagasins();
    if (!magasins) return;

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    magasins.slice(1).forEach(row => {
        const [
            code,          // 0
            fait,          // 1
            nomComplet,    // 2
            type,          // 3
            nomCourt,      // 4
            adresse,       // 5
            cp,            // 6
            ville,         // 7
            , , ,          // colonnes inutiles (8,9,10)
            lat,           // 11
            lng            // 12
        ] = row;

        const adresseComplete = `${adresse}, ${cp} ${ville}`;
        const distance = calculDistance(lat, lng);

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${code}</td>
            <td>${fait ? "✔️" : ""}</td>
            <td>${nomComplet}</td>
            <td>${type}</td>
            <td>${nomCourt}</td>
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
// AUTO LOAD
// =========================
loadMagasins();
