// =========================
// API Secure Worker
// =========================
const API = "https://winter-bar-234b.rudychappron.workers.dev";

// POSITION GPS
window.userLat = null;
window.userLng = null;

let gpsReady = false;
let gpsUpdating = false;

// TRI
let sortMode = "none"; // nom | type | visite | nonvisite | km
let modeProximite = false;

// CACHE adresse → pour accélérer
let addressCache = {};

// =========================
// Haversine
// =========================
function haversine(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 99999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI/180;
    const dLon = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*Math.PI/180) *
              Math.cos(lat2*Math.PI/180) *
              Math.sin(dLon/2)**2;

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// =========================
// ORS – Distance routière
// =========================
let lastORS = 0;

async function getRouteDistance(lat1, lng1, lat2, lng2) {
    const now = Date.now();
    if (now - lastORS < 1200) return null;
    lastORS = now;

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
            duree: h > 0 ? `${h}h${String(m).padStart(2,"0")}` : `${m} min`
        };

    } catch {
        return null;
    }
}


// =========================
// Normalisation adresse (avec cache)
// =========================
async function normalizeAddress(adresse, cp, ville) {
    const key = adresse + cp + ville;
    if (addressCache[key]) return addressCache[key];

    try {
        const res = await fetch(`${API}/geo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: `${adresse}, ${cp} ${ville}` })
        });

        const json = await res.json();
        const final = (json.length > 0 ? json[0].display_name : `${adresse}, ${cp} ${ville}`);

        addressCache[key] = final;
        return final;

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
// UPDATE VISITE ✔
// =========================
async function toggleVisite(code, checkbox) {
    await fetch(`${API}/updateVisite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code,
            fait: checkbox.checked === true
        })
    });
}


// =========================
// APPLY SORT (liste déroulante)
// =========================
function applySort() {
    sortMode = document.getElementById("sortSelect").value;
    loadMagasins();
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
        code: row[0],
        visite: (row[1] === true || row[1] === "TRUE"),
        nom: row[2],
        type: row[3],
        adresse: row[5],
        cp: row[6],
        ville: row[7],
        lat: Number(row[11]),
        lng: Number(row[12]),
        dist: (window.userLat ? haversine(window.userLat, window.userLng, row[11], row[12]) : 99999)
    }));

    // ======================
    // TRI demandé
    // ======================
    if (sortMode === "nom") list.sort((a,b) => a.nom.localeCompare(b.nom));
    if (sortMode === "type") list.sort((a,b) => a.type.localeCompare(b.type));
    if (sortMode === "visite") list = list.filter(x => x.visite);
    if (sortMode === "nonvisite") list = list.filter(x => !x.visite);
    if (sortMode === "km") list.sort((a,b)=> a.dist - b.dist);

    // Mode proximité (top 5)
    if (modeProximite) list = list.slice(0,5);

    // ======================
    // Construction des lignes
    // ======================
    for (const m of list) {

        let kmTxt = "-";
        let tempsTxt = "-";

        if (gpsReady && m.lat && m.lng) {
            const info = await getRouteDistance(window.userLat, window.userLng, m.lat, m.lng);
            if (info) {
                kmTxt = info.km;
                tempsTxt = info.duree;
            }
        }

        const adresseNorm = await normalizeAddress(m.adresse, m.cp, m.ville);
        const waze = `https://waze.com/ul?ll=${m.lat},${m.lng}&navigate=yes`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m.code}</td>
            <td><input type="checkbox" ${m.visite ? "checked" : ""} onchange="toggleVisite('${m.code}', this)"></td>
            <td>${m.nom}</td>
            <td>${m.type}</td>
            <td>${adresseNorm}</td>
            <td><a href="${waze}" target="_blank"><img src="https://files.brandlogos.net/svg/KWGOdcgoGJ/waze-app-icon-logo-brandlogos.net_izn3bglse.svg" style="width:30px"></a></td>
            <td>${kmTxt}</td>
            <td>${tempsTxt}</td>
            <td><button onclick="editMagasin('${m.code}')">✏️</button></td>
        `;
        tbody.appendChild(tr);
    }
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
            loadMagasins().then(()=> gpsUpdating=false);
        }
    },
    err => console.warn("GPS refusé:", err),
    { enableHighAccuracy: true }
);


// =========================
// Navigation
// =========================
function editMagasin(code) { location.href = `edit-magasin.html?code=${code}`; }
function goAdd() { location.href = "add-magasin.html"; }
function toggleView() { modeProximite = !modeProximite; loadMagasins(); }


// =========================
// PREMIER AFFICHAGE
// =========================
loadMagasins();
