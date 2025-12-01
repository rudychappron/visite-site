// =====================================
// CONFIG
// =====================================
const API = "https://winter-bar-234b.rudychappron.workers.dev";

window.userLat = null;
window.userLng = null;

let gpsReady = false;
let sortCol = null;
let sortAsc = true;

let addressCache = {};

let fullMagList = [];   // RAW depuis Sheets
let typeList = [];      // Types dynamiques


// =====================================
// HAVERSINE
// =====================================
function haversine(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 99999;

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI/180;
    const dLon = (lon2 - lon1) * Math.PI/180;

    const a =
        Math.sin(dLat/2)**2 +
        Math.cos(lat1*Math.PI/180) *
        Math.cos(lat2*Math.PI/180) *
        Math.sin(dLon/2)**2;

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}


// =====================================
// ORS ROUTE DISTANCE
// =====================================
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

        const duree = h > 0 ? `${h}h${String(m).padStart(2,"0")}` : `${m} min`;

        return { km, duree };

    } catch {
        return null;
    }
}



// =====================================
// NORMALISATION ADRESSE + CACHE
// =====================================
async function normalizeAddress(a, cp, v) {
    const key = a + cp + v;

    if (addressCache[key]) return addressCache[key];

    try {
        const res = await fetch(`${API}/geo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `${a}, ${cp} ${v}`
            })
        });

        const json = await res.json();
        const final = json.length > 0 ? json[0].display_name : `${a}, ${cp} ${v}`;

        addressCache[key] = final;
        return final;

    } catch {
        return `${a}, ${cp} ${v}`;
    }
}



// =====================================
// GET MAGASINS
// =====================================
async function getMagasins() {
    try {
        const res = await fetch(`${API}/get`);
        const json = await res.json();
        return json.data || [];
    } catch {
        return [];
    }
}



// =====================================
// SAUVEGARDE VISITE
// =====================================
async function toggleVisite(code, el) {
    await fetch(`${API}/updateVisite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code,
            fait: el.checked
        })
    });

    loadMagasins();
}



// =====================================
// TRI
// =====================================
function sortBy(col) {
    if (sortCol === col) sortAsc = !sortAsc;
    else { sortCol = col; sortAsc = true; }

    loadMagasins();
}



// =====================================
// FILTRES + RECHERCHE
// =====================================
function onSearchChange() { loadMagasins(); }
function onFilterChange() { loadMagasins(); }


// =====================================
// AFFICHAGE TABLEAU
// =====================================
async function loadMagasins() {

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    const search = document.getElementById("search").value.toLowerCase();
    const fVisite = document.getElementById("filterVisite").value;
    const fType = document.getElementById("filterType").value;

    let list = fullMagList.map(r => ({
        code: r.code,
        visite: r.visite,
        nom: r.nom,
        type: r.type,
        adresse: r.adresse,
        cp: r.cp,
        ville: r.ville,
        lat: r.lat,
        lng: r.lng,
        dist: (window.userLat ? haversine(window.userLat, window.userLng, r.lat, r.lng) : 99999)
    }));


    // 🔍 FILTRE RECHERCHE
    list = list.filter(m =>
        m.code.toString().includes(search) ||
        m.nom.toLowerCase().includes(search) ||
        m.type.toLowerCase().includes(search) ||
        m.ville.toLowerCase().includes(search)
    );


    // 🟦 FILTRE VISITE
    if (fVisite === "visite") list = list.filter(m => m.visite);
    if (fVisite === "nonvisite") list = list.filter(m => !m.visite);

    // 🟪 FILTRE TYPE
    if (fType !== "all") list = list.filter(m => m.type === fType);


    // 🔽 TRI
    if (sortCol === "code") list.sort((a,b)=> sortAsc ? a.code - b.code : b.code - a.code);
    if (sortCol === "nom") list.sort((a,b)=> sortAsc ? a.nom.localeCompare(b.nom) : b.nom.localeCompare(a.nom));
    if (sortCol === "type") list.sort((a,b)=> sortAsc ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type));
    if (sortCol === "visite") list.sort((a,b)=> sortAsc ? a.visite - b.visite : b.visite - a.visite);
    if (sortCol === "km") list.sort((a,b)=> sortAsc ? a.dist - b.dist : b.dist - a.dist);


    // 🔁 LIGNES
    for (const m of list) {

        let kmTxt = "-";
        let tempsTxt = "-";

        if (gpsReady && m.lat && m.lng) {
            const info = await getRouteDistance(window.userLat, window.userLng, m.lat, m.lng);
            if (info) { kmTxt = info.km; tempsTxt = info.duree; }
        }

        const fullAdr = await normalizeAddress(m.adresse, m.cp, m.ville);
        const waze = `https://waze.com/ul?ll=${m.lat},${m.lng}&navigate=yes`;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${m.code}</td>
            <td><input type="checkbox" ${m.visite ? "checked" : ""} onchange="toggleVisite('${m.code}', this)"></td>
            <td>${m.nom}</td>
            <td>${m.type}</td>
            <td>${fullAdr}</td>
            <td><a href="${waze}" target="_blank"><img src="https://files.brandlogos.net/svg/KWGOdcgoGJ/waze-app-icon-logo-brandlogos.net_izn3bglse.svg" width="30"></a></td>
            <td>${kmTxt}</td>
            <td>${tempsTxt}</td>
            <td><button onclick="editMagasin('${m.code}')">✏️</button></td>
        `;

        tbody.appendChild(tr);
    }
}



// =====================================
// CHARGEMENT INITIAL + TYPES DYNAMIQUES
// =====================================
async function initMagasins() {

    const raw = await getMagasins();

    // Convert RAW
    fullMagList = raw.slice(1).map(r => ({
        code: r[0],
        visite: (r[1] === true || r[1] === "TRUE"),
        nom: r[2],
        type: r[3],
        adresse: r[5],
        cp: r[6],
        ville: r[7],
        lat: Number(r[11]),
        lng: Number(r[12])
    }));


    // 🔥 TYPES DYNAMIQUES
    typeList = [...new Set(fullMagList.map(m => m.type).filter(t => t && t.trim() !== ""))];

    const sel = document.getElementById("filterType");
    sel.innerHTML = `<option value="all">Tous les types</option>`;

    typeList.sort().forEach(t => {
        sel.innerHTML += `<option value="${t}">${t}</option>`;
    });

    loadMagasins();
}



// =====================================
// GPS
// =====================================
navigator.geolocation.watchPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
        gpsReady = true;
        loadMagasins();
    },
    err => console.warn("GPS refusé:", err),
    { enableHighAccuracy: true }
);


// =====================================
// Navigation
// =====================================
function editMagasin(code) { location.href = `edit-magasin.html?code=${code}`; }
function goAdd() { location.href = "add-magasin.html"; }

// Cache
function clearCache() {
    addressCache = {};
    alert("Cache vidé ✔");
}


// =====================================
// START
// =====================================
initMagasins();
