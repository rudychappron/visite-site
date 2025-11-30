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
        return (data && data.length > 0) ? data[0].display_name : full;
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
            body: JSON.stringify({ coordinates: [[lng1, lat1], [lng2, lat2]] })
        });

        const json = await res.json();
        if (!json.routes || !json.routes[0]) return null;

        const km = (json.routes[0].summary.distance / 1000).toFixed(1) + " km";

        const sec = json.routes[0].summary.duration;
        const min = Math.round(sec / 60);
        const h = Math.floor(min / 60);
        const m = min % 60;
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
// UPDATE VISITE (AVEC POPUP)
// =========================
async function toggleVisite(code, checkboxElement) {

    const newState = checkboxElement.checked;

    // Popup confirmation
    const confirmMsg = newState
        ? "Confirmer : marquer ce magasin comme VISITÉ ?"
        : "Confirmer : marquer ce magasin comme NON VISITÉ ?";

    const ok = confirm(confirmMsg);

    if (!ok) {
        checkboxElement.checked = !newState; // on remet comme avant
        return;
    }

    // Mise à jour backend
    try {
        await fetch(`${API}/updateVisite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code,
                fait: newState === true
            })
        });

        console.log("✓ Visite mise à jour :", code, newState);

    } catch (e) {
        alert("❌ Erreur ! La mise à jour n’a pas été faite.");
        checkboxElement.checked = !newState;
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
                    onchange="toggleVisite('${code}', this)"
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
// RAFRAÎCHIR LA POSITION
// =========================
async function refreshPosition() {
    navigator.geolocation.getCurrentPosition(
        pos => {
            window.userLat = pos.coords.latitude;
            window.userLng = pos.coords.longitude;
            loadMagasins();
        },
        () => console.warn("GPS refusé pour rafraîchir la position")
    );
}

// =========================
// AUTO-REFRESH – 60s
// =========================
setInterval(() => {
    console.log("🔄 Auto-refresh position…");
    refreshPosition();
}, 60000);

// =========================
// NAVIGATION
// =========================
function editMagasin(code) { window.location.href = `edit-magasin.html?code=${code}`; }
function goAdd() { window.location.href = "add-magasin.html"; }

// =========================
// GPS INITIAL
// =========================
navigator.geolocation.getCurrentPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
        loadMagasins();
    },
    () => loadMagasins()
);
