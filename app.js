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

// ============================
// ORS - Distance + Durée
// ============================
async function getRouteDistance(lat1, lng1, lat2, lng2) {
    try {
        const url = "https://api.openrouteservice.org/v2/directions/driving-car";

        const body = {
            coordinates: [
                [lng1, lat1],
                [lng2, lat2]
            ]
        };

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": ORS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const json = await res.json();
        if (!json.routes || !json.routes[0]) return null;

        const meters = json.routes[0].summary.distance;
        const km = (meters / 1000).toFixed(1) + " km";

        const seconds = json.routes[0].summary.duration;
        const mins = Math.round(seconds / 60);

        const h = Math.floor(mins / 60);
        const m = mins % 60;

        const duree =
            h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;

        return { km, duree };

    } catch (e) {
        console.error("❌ ORS erreur :", e);
        return null;
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
// UPDATE VISITE magasin — FIX FINAL
// =========================
async function toggleVisite(code, visited) {
    try {
        await fetch(`${API}/updateVisite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: code,
                fait: visited === true // 🟢 garantit un BOOLEAN
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
        const fait =
            row[1] === true ||
            row[1] === "TRUE" ||
            row[1] === "true"; // 🟢 gère toutes les valeurs envoyées par Sheets

        const nomComplet = row[2];
        const type = row[3];
        const adresse = row[5];
        const cp = String(row[6]).padStart(5, "0");
        const ville = row[7];
        const lat = row[11];
        const lng = row[12];

        const adresseComplete = await normalizeAddress(adresse, cp, ville);

        let kmTxt = "-";
        let tempsTxt = "-";

        if (lat && lng && window.userLat && window.userLng) {
            const info = await getRouteDistance(
                window.userLat,
                window.userLng,
                lat,
                lng
            );
            if (info) {
                kmTxt = info.km;
                tempsTxt = info.duree;
            }
        }

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

            <td>${kmTxt}</td>
            <td>${tempsTxt}</td>

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
