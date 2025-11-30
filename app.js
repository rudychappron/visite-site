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
        const res = await fetch(url, { headers: { "User-Agent": "RudyApp/1.0" }});
        const data = await res.json();
        if (!data || data.length === 0) return full;
        return data[0].display_name;
    } catch {
        return full;
    }
}

// ============================
// ORS - Distance + Durée
// ============================
async function getRouteDistance(lat1, lng1, lat2, lng2) {
    try {
        const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
            method: "POST",
            headers: {
                "Authorization": ORS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                coordinates: [
                    [lng1, lat1],
                    [lng2, lat2]
                ]
            })
        });

        const json = await res.json();
        if (!json.routes || !json.routes[0]) return null;

        // Distance
        const km = (json.routes[0].summary.distance / 1000).toFixed(1) + " km";

        // Temps
        const seconds = json.routes[0].summary.duration;
        const minutes = Math.round(seconds / 60);
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const duree = h > 0 ? `${h}h${String(m).padStart(2,"0")}` : `${m} min`;

        return { km, duree };

    } catch {
        return null;
    }
}

// =========================
// GET — lire magasins
// =========================
async function getMagasins() {
    try {
        const res = await fetch(`${API}/get`);
        const json = await res.json();
        return json.data || json;
    } catch {
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
// UPDATE VISITE magasin
// =========================
async function toggleVisite(code, visited) {
    try {
        await fetch(`${API}/updateVisite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: code,
                fait: visited === true
            })
        });

        console.log("✓ Visite mise à jour :", code, visited);

    } catch (e) {
        console.error("❌ Erreur updateVisite :", e);
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

        const adresseComplete = await normalizeAddress(adresse, cp, ville);

        let kmTxt = "-";
        let tempsTxt = "-";

        if (lat && lng && window.userLat && window.userLng) {
            const info = await getRouteDistance(window.userLat, window.userLng, lat, lng);
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
function editMagasin(code) { window.location.href = `edit-magasin.html?code=${code}`; }
function goAdd() { window.location.href = "add-magasin.html"; }

// =========================
// GPS + chargement
// =========================
navigator.geolocation.getCurrentPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
        loadMagasins();
    },
    () => loadMagasins()
);
