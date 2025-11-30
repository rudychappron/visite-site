// =========================
// API Secure Worker
// =========================
const API = "https://winter-bar-234b.rudychappron.workers.dev";

// Position GPS utilisateur
window.userLat = null;
window.userLng = null;

// Pour éviter de lancer 50 recalculs d’un coup
let gpsReady = false;
let gpsUpdating = false;

let modeProximite = true;


// =======================================
// 🔥 HAVERSINE – Distance "à vol d’oiseau"
// =======================================
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}


// ============================
// ORS - Distance + Durée via Worker
// ============================
async function getRouteDistance(lat1, lng1, lat2, lng2) {
    try {
        const res = await fetch(`${API}/ors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                coordinates: [
                    [lng1, lat1],
                    [lng2, lat2]
                ]
            })
        });

        if (!res.ok) return null;
        const json = await res.json();
        if (!json.routes || !json.routes[0]) return null;

        const meters = json.routes[0].summary.distance;
        const seconds = json.routes[0].summary.duration;

        const km = (meters / 1000).toFixed(1) + " km";

        const min = Math.round(seconds / 60);
        const h = Math.floor(min / 60);
        const m = min % 60;

        const duree = h > 0 ? `${h}h${String(m).padStart(2,"0")}` : `${m} min`;

        return { km, duree };

    } catch {
        return null;
    }
}


// ============================
// Normalisation adresse via /geo
// ============================
async function normalizeAddress(adresse, cp, ville) {
    const full = `${adresse}, ${cp} ${ville}`;

    try {
        const res = await fetch(`${API}/geo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: full })
        });

        const json = await res.json();
        if (json && json.length > 0) return json[0].display_name;

        return full;
    } catch {
        return full;
    }
}


// =========================
// GET magasins
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
// Toggle VISITE
// =========================
async function toggleVisite(code, checkboxElement) {

    const newState = checkboxElement.checked;

    if (!confirm(newState ? "Marquer VISITÉ ?" : "Marquer NON VISITÉ ?")) {
        checkboxElement.checked = !newState;
        return;
    }

    await fetch(`${API}/updateVisite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, fait: newState })
    });
}


// =========================
// AFFICHAGE TABLEAU
// =========================
async function loadMagasins() {

    const magasins = await getMagasins();
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    let list = magasins.slice(1).map(row => {

        // ⚠ lat = col 11, lng = col 12
        const lat = row[11];
        const lng = row[12];

        return {
            row,
            lat,
            lng,
            dist: (window.userLat ? haversine(window.userLat, window.userLng, lat, lng) : 99999)
        };
    });

    list.sort((a,b) => a.dist - b.dist);

    const toDisplay = modeProximite ? list.slice(0,5) : list;

    for (const item of toDisplay) {

        const row = item.row;
        const code = row[0];
        const fait = row[1] === true || row[1] === "TRUE";
        const nomComplet = row[2];
        const type = row[3];
        const adresse = row[5];
        const cp = String(row[6]).padStart(5,"0");
        const ville = row[7];

        const lat = item.lat;
        const lng = item.lng;

        let kmTxt = "-";
        let tempsTxt = "-";

        if (gpsReady && lat && lng) {
            const info = await getRouteDistance(window.userLat, window.userLng, lat, lng);
            if (info) {
                kmTxt = info.km;
                tempsTxt = info.duree;
            }
        }

        const adresseComplete = await normalizeAddress(adresse, cp, ville);

        const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${code}</td>
            <td><input type="checkbox" ${fait ? "checked" : ""} onchange="toggleVisite('${code}', this)"></td>
            <td>${nomComplet}</td>
            <td>${type}</td>
            <td>${adresseComplete}</td>
            <td><a href="${wazeUrl}" target="_blank"><img src="https://files.brandlogos.net/svg/KWGOdcgoGJ/waze-app-icon-logo-brandlogos.net_izn3bglse.svg" style="width:30px;height:30px;"></a></td>
            <td>${kmTxt}</td>
            <td>${tempsTxt}</td>
            <td><button onclick="editMagasin('${code}')">✏️</button><button onclick="deleteMagasin('${code}')">🗑</button></td>
        `;

        tbody.appendChild(tr);
    }
}


// =========================
// GPS TEMPS RÉEL — watchPosition
// =========================
navigator.geolocation.watchPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;

        gpsReady = true;

        if (!gpsUpdating) {
            gpsUpdating = true;
            loadMagasins().then(() => gpsUpdating = false);
        }
    },
    err => console.warn("GPS refusé", err),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
);


// =========================
// Navigation
// =========================
function editMagasin(code) { location.href = `edit-magasin.html?code=${code}`; }
function goAdd() { location.href = "add-magasin.html"; }
function toggleView() { modeProximite = !modeProximite; loadMagasins(); }


// =========================
// Premier affichage
// =========================
loadMagasins();
