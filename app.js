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
// NORMALISATION D’ADRESSE (OSM)
// =========================
async function normalizeAddress(adresse, cp, ville) {
    const full = `${adresse}, ${cp} ${ville}`;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(full)}`;

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "RudyApp/1.0"
            }
        });

        const data = await res.json();

        if (!data || data.length === 0) return full;

        const item = data[0];

        return item.display_name; // adresse officielle
    } catch (e) {
        console.warn("Adresse non normalisée :", e);
        return full;
    }
}


// =========================
// GET — lire magasins
// =========================
async function getMagasins() {
    const res = await fetch(`${API}/get`, { method: "GET" });

    let json;
    try {
        json = await res.json();
    } catch (e) {
        console.error("❌ Impossible de lire la réponse Worker :", e);
        return [];
    }

    console.log("Réponse API brute :", json);

    if (Array.isArray(json)) return json;
    if (json.data) return json.data;

    return [];
}


// =========================
// DELETE magasin
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
// UPDATE VISITE magasin
// =========================
async function toggleVisite(code, visited) {
    try {
        await fetch(`${API}/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: code,
                fait: visited ? "TRUE" : "FALSE"
            })
        });

        console.log(`✓ Visite mise à jour pour ${code} → ${visited}`);
    } catch (e) {
        console.error("❌ Erreur mise à jour visite :", e);
    }
}


// =========================
// RENDER TABLE (route ORS)
// =========================
async function loadMagasins() {
    const magasins = await getMagasins();
    if (!magasins || magasins.length === 0) {
        console.warn("⚠ Aucun magasin reçu !");
        return;
    }

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    for (const row of magasins.slice(1)) {

        const code = row[0] ?? "";
        const fait = row[1] ?? false;
        const nomComplet = row[2] ?? "";
        const type = row[3] ?? "";
        const adresse = row[5] ?? "";
        const cp = String(row[6] ?? "").padStart(5, "0");
        const ville = row[7] ?? "";
        const lat = row[11] ?? null;
        const lng = row[12] ?? null;

        // Adresse brute
        const adresseBrute = `${adresse} ${cp} ${ville}`.trim();

        // Adresse normalisée OSM
        let adresseComplete = await normalizeAddress(adresse, cp, ville);

        // =============================
        // DISTANCE ROUTIÈRE ORS
        // =============================
        let distance = "-";

        if (lat && lng && window.userLat && window.userLng) {
            distance = await getRouteDistance(
                window.userLat,
                window.userLng,
                lat,
                lng
            );
        }

        // =============================
        // WAZE — VRAI LOGO OFFICIEL
        // =============================
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
                         alt="Waze"
                         style="width:30px; height:30px;">
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
// CHARGEMENT AUTO APRÈS GPS
// =========================
navigator.geolocation.getCurrentPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
        loadMagasins();
    },
    () => {
        console.warn("GPS refusé → chargement sans distance");
        loadMagasins();
    }
);
