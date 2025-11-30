// =========================
// API Secure Worker
// =========================
const API = "https://winter-bar-234b.rudychappron.workers.dev";


// =========================
// POSITION GPS UTILISATEUR
// =========================
window.userLat = null;
window.userLng = null;


// =========================
// NORMALISATION ADRESSE (OSM)
// =========================
async function normalizeAddress(adresse, cp, ville) {
    const full = `${adresse}, ${cp} ${ville}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(full)}`;

    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "RudyApp/1.0" }
        });

        const data = await res.json();
        if (!data || data.length === 0) return full;

        return data[0].display_name;
    } catch (e) {
        console.warn("Adresse non normalisée :", e);
        return full;
    }
}


// =========================
// GET — lire magasins
// =========================
async function getMagasins() {
    const res = await fetch(`${API}/get`);
    try {
        const json = await res.json();
        return json.data || json;
    } catch (e) {
        console.error("Erreur JSON :", e);
        return [];
    }
}


// =========================
// DELETE magasin
// =========================
async function deleteMagasin(code) {
    await fetch(`${API}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
    });
    loadMagasins();
}


// =========================
// UPDATE VISITE magasin — CORRIGÉ
// =========================
async function toggleVisite(code, visited) {
    try {
        await fetch(`${API}/updateVisite`, {   // ← ICI ✔
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: code,
                fait: visited                // ← Apps Script veut TRUE/FALSE natif
            })
        });

        console.log(`✓ Visite mise à jour pour ${code}`);

    } catch (e) {
        console.error("❌ Erreur mise à jour visite :", e);
    }
}


// =========================
// RENDER TABLE
// =========================
async function loadMagasins() {
    const magasins = await getMagasins();
    const tbody = document.querySelector("tbody");

    tbody.innerHTML = "";

    for (const row of magasins.slice(1)) {

        const code = row[0];
        const fait = row[1] === true || row[1] === "TRUE";
        const nomComplet = row[2];
        const type = row[3];
        const adresse = row[5];
        const cp = String(row[6]).padStart(5, "0");
        const ville = row[7];
        const lat = row[11];
        const lng = row[12];

        // Adresse normalisée
        const adresseComplete = await normalizeAddress(adresse, cp, ville);

        // Distance ORS
        let distance = "-";
        if (lat && lng && window.userLat && window.userLng) {
            distance = await getRouteDistance(
                window.userLat,
                window.userLng,
                lat,
                lng
            );
        }

        // URL Waze
        const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${code}</td>

            <td>
                <input 
                    type="checkbox"
                    ${fait ? "checked" : ""}
                    onchange="toggleVisite('${code}', this.checked)"
                >
            </td>

            <td>${nomComplet}</td>
            <td>${type}</td>
            <td>${adresseComplete}</td>

            <td>
                <a class="waze-btn" href="${wazeUrl}" target="_blank">
                    <img src="https://files.brandlogos.net/svg/KWGOdcgoGJ/waze-app-icon-logo-brandlogos.net_izn3bglse.svg"
                         style="width:30px;height:30px;">
                </a>
            </td>

            <td>${distance}</td>

            <td>
                <button onclick="editMagasin('${code}')">✏️</button>
                <button onclick="deleteMagasin('${code}')">🗑</button>
            </td>
        `;

        tbody.appendChild(tr);
    }
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
// CHARGEMENT APRÈS GPS
// =========================
navigator.geolocation.getCurrentPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
        loadMagasins();
    },
    () => {
        console.warn("GPS refusé");
        loadMagasins();
    }
);
