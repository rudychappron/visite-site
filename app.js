// =========================
// API Secure Worker
// =========================
const API = "https://winter-bar-234b.rudychappron.workers.dev";

window.userLat = null;
window.userLng = null;

let gpsReady = false;
let gpsUpdating = false;
let modeProximite = true;

// === Limiteur ORS (évite d'exploser ton quota) ===
let lastORSCall = 0;
async function safeGetRouteDistance(lat1, lng1, lat2, lng2) {
    const now = Date.now();
    if (now - lastORSCall < 10000) return null;
    lastORSCall = now;
    return await getRouteDistance(lat1, lng1, lat2, lng2);
}

// =========================
// Haversine
// =========================
function haversine(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 99999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// =========================
// ORS
// =========================
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
        if (!json.routes) return null;

        const meters = json.routes[0].summary.distance;
        const seconds = json.routes[0].summary.duration;

        const km = (meters / 1000).toFixed(1) + " km";

        const min = Math.round(seconds / 60);
        const h = Math.floor(min / 60);
        const m = min % 60;

        return {
            km,
            duree: (h > 0 ? `${h}h${String(m).padStart(2,"0")}` : `${m} min`)
        };

    } catch (e) { return null; }
}

// =========================
// Normalisation adresse
// =========================
async function normalizeAddress(adresse, cp, ville) {
    try {
        const res = await fetch(`${API}/geo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: `${adresse}, ${cp} ${ville}` })
        });

        const json = await res.json();
        if (json.length > 0) return json[0].display_name;
        return `${adresse}, ${cp} ${ville}`;

    } catch {
        return `${adresse}, ${cp} ${ville}`;
    }
}

// =========================
// GET magasins
// =========================
async function getMagasins() {
    try {
        const res = await fetch(`${API}/get`);
        const json = await res.json();
        return json.data || [];
    } catch { return []; }
}

// =========================
// SAVE VISITE — CORRIGÉ
// =========================
async function toggleVisite(code, checkbox) {
    const state = checkbox.checked === true;

    await fetch(`${API}/updateVisite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code: code,
            fait: state   // ✔ BOOL correct (pas une string)
        })
    });
}

// =========================
// TRI GLOBAL
// =========================
let currentSort = { col: null, asc: true };

function sortList(list, colIndex) {
    if (currentSort.col === colIndex)
        currentSort.asc = !currentSort.asc;
    else {
        currentSort.col = colIndex;
        currentSort.asc = true;
    }

    list.sort((a, b) => {
        const va = a.row[colIndex];
        const vb = b.row[colIndex];

        if (va < vb) return currentSort.asc ? -1 : 1;
        if (va > vb) return currentSort.asc ? 1 : -1;
        return 0;
    });
}

// =========================
// AFFICHAGE TABLEAU
// =========================
async function loadMagasins() {

    const data = await getMagasins();
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    let list = data.slice(1).map(row => ({
        row,
        lat: Number(row[11]),
        lng: Number(row[12]),
        dist: (window.userLat ? haversine(window.userLat, window.userLng, row[11], row[12]) : 99999)
    }));

    // TRI par nom si demandé
    if (currentSort.col !== null)
        sortList(list, currentSort.col);

    // Affichage selon mode
    const show = modeProximite ? list.slice(0,5) : list;

    for (const item of show) {

        const r = item.row;
        const code = r[0];
        const fait = r[1] === true || r[1] === "TRUE";

        let kmTxt = "-";
        let tempsTxt = "-";

        if (gpsReady && item.lat && item.lng) {
            const info = await safeGetRouteDistance(
                window.userLat,
                window.userLng,
                item.lat,
                item.lng
            );
            if (info) {
                kmTxt = info.km;
                tempsTxt = info.duree;
            }
        }

        const adresseComplete = await normalizeAddress(r[5], r[6], r[7]);

        const wazeUrl = `https://waze.com/ul?ll=${item.lat},${item.lng}&navigate=yes`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td onclick="sortListClick(0)">${code}</td>
            <td><input type="checkbox" ${fait ? "checked" : ""} onchange="toggleVisite('${code}', this)"></td>
            <td onclick="sortListClick(2)">${r[2]}</td>
            <td onclick="sortListClick(3)">${r[3]}</td>
            <td>${adresseComplete}</td>
            <td><a href="${wazeUrl}" target="_blank"><img src="https://files.brandlogos.net/svg/KWGOdcgoGJ/waze-app-icon-logo-brandlogos.net_izn3bglse.svg" style="width:30px"></a></td>
            <td onclick="sortListClick('km')">${kmTxt}</td>
            <td onclick="sortListClick('time')">${tempsTxt}</td>
            <td><button onclick="editMagasin('${code}')">✏️</button></td>
        `;
        tbody.appendChild(tr);
    }
}

// Clic tri colonne
function sortListClick(col) {
    currentSort.col = col;
    currentSort.asc = !currentSort.asc;
    loadMagasins();
}

// =========================
// GPS TEMPS RÉEL
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
    err => console.warn("GPS refusé:", err),
    { enableHighAccuracy: true }
);

// =========================
// Navigation
// =========================
function editMagasin(code) {
    location.href = `edit-magasin.html?code=${code}`;
}
function goAdd() {
    location.href = "add-magasin.html";
}
function toggleView() {
    modeProximite = !modeProximite;
    loadMagasins();
}

// Premier affichage
loadMagasins();
