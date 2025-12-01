/***************************************************
 * PARTIE 1 — CONFIG + OUTILS
 ***************************************************/
const API = "https://winter-bar-234b.rudychappron.workers.dev";

window.userLat = null;
window.userLng = null;

let gpsReady = false;
let sortCol = "vol";      // tri par défaut = distance vol d’oiseau
let sortAsc = true;

let addressCache = {};
let fullMagList = [];
let typeList = [];



/***************************************************
 * HAVERSINE — VOL D’OISEAU
 ***************************************************/
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



/***************************************************
 * ORS — DISTANCE ROUTE (FAIBLE FRÉQUENCE)
 ***************************************************/
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



/***************************************************
 * ADRESSE NORMALISÉE + CACHE
 ***************************************************/
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



/***************************************************
 * GET MAGASINS
 ***************************************************/
async function getMagasins() {
    try {
        const res = await fetch(`${API}/get`);
        const json = await res.json();
        return json.data || [];
    } catch {
        return [];
    }
}



/***************************************************
 * SAVE VISITE
 ***************************************************/
async function toggleVisite(code, el) {
    await fetch(`${API}/updateVisite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code,
            fait: el.checked
        })
    });

    // Ne PAS recharger tableau : pas besoin
}


/***************************************************
 * PARTIE 2 — RECHERCHE + FILTRES + TRI + AFFICHAGE
 ***************************************************/


/***********************
 * Recherche / Filtres
 ***********************/
function onSearchChange() { renderTable(); }
function onFilterChange() { renderTable(); }


/***********************
 * TRI
 ***********************/
function sortBy(col) {
    if (sortCol === col) sortAsc = !sortAsc;
    else { sortCol = col; sortAsc = true; }

    renderTable();
}



/***************************************************
 * RENDER TABLE — GÉNÈRE LE TABLEAU UNE SEULE FOIS
 ***************************************************/
async function renderTable() {

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    const search = document.getElementById("search").value.toLowerCase();
    const fVisite = document.getElementById("filterVisite").value;
    const fType = document.getElementById("filterType").value;

    // Construction de la liste
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
        distVoie: (window.userLat ? haversine(window.userLat, window.userLng, r.lat, r.lng) : 99999)
    }));


    /***********************
     * 1️⃣ Filtre recherche
     ***********************/
    list = list.filter(m =>
        m.code.toString().includes(search) ||
        m.nom.toLowerCase().includes(search) ||
        m.type.toLowerCase().includes(search) ||
        m.ville.toLowerCase().includes(search)
    );


    /***********************
     * 2️⃣ Filtre Visite
     ***********************/
    if (fVisite === "visite") list = list.filter(m => m.visite);
    if (fVisite === "nonvisite") list = list.filter(m => !m.visite);


    /***********************
     * 3️⃣ Filtre Type dynamique
     ***********************/
    if (fType !== "all") list = list.filter(m => m.type === fType);



    /***********************
     * 4️⃣ TRI
     ***********************/
    if (sortCol === "code") list.sort((a,b)=> sortAsc ? a.code - b.code : b.code - a.code);
    if (sortCol === "nom") list.sort((a,b)=> sortAsc ? a.nom.localeCompare(b.nom) : b.nom.localeCompare(a.nom));
    if (sortCol === "type") list.sort((a,b)=> sortAsc ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type));
    if (sortCol === "visite") list.sort((a,b)=> sortAsc ? a.visite - b.visite : b.visite - a.visite);

    // 🔥 TRI PAR DÉFAUT = distance vol d'oiseau
    if (sortCol === "vol") list.sort((a,b)=> sortAsc ? a.distVoie - b.distVoie : b.distVoie - a.distVoie);



    /***************************************************
     * 5️⃣ GENERATION DES LIGNES
     ***************************************************/
    for (const m of list) {

        // Adresse normalisée (en cache instant)
        const fullAdr = await normalizeAddress(m.adresse, m.cp, m.ville);

        // Lien waze
        const waze = `https://waze.com/ul?ll=${m.lat},${m.lng}&navigate=yes`;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${m.code}</td>

            <td>
                <input type="checkbox" ${m.visite ? "checked" : ""}
                       onchange="toggleVisite('${m.code}', this)">
            </td>

            <td>${m.nom}</td>
            <td>${m.type}</td>
            <td>${fullAdr}</td>

            <td>
                <a href="${waze}" target="_blank">
                    <img src="https://files.brandlogos.net/svg/KWGOdcgoGJ/waze-app-icon-logo-brandlogos.net_izn3bglse.svg"
                         width="30">
                </a>
            </td>

            <!-- 🔥 Distance vol d’oiseau -->
            <td class="volCell" data-code="${m.code}">
                ${m.distVoie.toFixed(1)} km
            </td>

            <!-- 🔥 Distance ORS (mise à jour auto) -->
            <td class="kmCell" data-code="${m.code}">-</td>

            <!-- 🔥 Temps ORS (mise à jour auto) -->
            <td class="timeCell" data-code="${m.code}">-</td>

            <td>
                <button onclick="editMagasin('${m.code}')">✏️</button>
            </td>
        `;

        tbody.appendChild(tr);
    }
}



/***************************************************
 * INITIALISATION — GET + TYPES DYNAMIQUES
 ***************************************************/
async function initMagasins() {

    const raw = await getMagasins();

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


    /***********************
     * Chargement des types dynamiques
     ***********************/
    typeList = [...new Set(fullMagList.map(m => m.type).filter(t => t && t.trim() !== ""))];

    const sel = document.getElementById("filterType");
    sel.innerHTML = `<option value="all">Tous les types</option>`;

    typeList.sort().forEach(t => {
        sel.innerHTML += `<option value="${t}">${t}</option>`;
    });

    /***********************
     * Affiche tableau une seule fois
     ***********************/
    renderTable();
}


/***************************************************
 * PARTIE 3 — GPS + UPDATE DISTANCES SANS REFRESH
 ***************************************************/


/***************************************************
 * MISE À JOUR DES DISTANCES (VOL + ORS)
 * ⚡ Sans recharger le tableau
 ***************************************************/
async function updateDistancesOnly() {

    if (!gpsReady) return;

    // Pour chaque magasin → MAJ 3 cellules
    fullMagList.forEach(async m => {

        /***************
         * 1️⃣ MAJ VOL D’OISEAU
         ***************/
        const vol = haversine(window.userLat, window.userLng, m.lat, m.lng);

        const volCell = document.querySelector(`.volCell[data-code="${m.code}"]`);
        if (volCell) volCell.innerText = vol.toFixed(1) + " km";


        /***************
         * 2️⃣ MAJ ROUTE ORS (KM + TEMPS)
         ***************/
        getRouteDistance(window.userLat, window.userLng, m.lat, m.lng)
        .then(info => {
            if (!info) return;

            const kmCell = document.querySelector(`.kmCell[data-code="${m.code}"]`);
            const timeCell = document.querySelector(`.timeCell[data-code="${m.code}"]`);

            if (kmCell) kmCell.innerText = info.km;
            if (timeCell) timeCell.innerText = info.duree;
        });

    });
}



/***************************************************
 * GPS LIVE — déclenche MAJ distances + tri distance
 ***************************************************/
navigator.geolocation.watchPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
        gpsReady = true;

        // À la première localisation → tri automatique
        if (sortCol === "vol") renderTable();

        // Puis MAJ distances live
        updateDistancesOnly();
    },
    err => console.warn("GPS refusé:", err),
    { enableHighAccuracy: true }
);



/***************************************************
 * REFRESH AUTOMATIQUE TOUTES LES 30 SECONDES
 * ✔ Sans recharger le tableau
 ***************************************************/
setInterval(() => {
    if (gpsReady) updateDistancesOnly();
}, 30000);



/***************************************************
 * NAVIGATION
 ***************************************************/
function editMagasin(code) { location.href = `edit-magasin.html?code=${code}`; }
function goAdd() { location.href = "add-magasin.html"; }

function clearCache() {
    addressCache = {};
    alert("Cache vidé ✔");
}



/***************************************************
 * START — CHARGEMENT INITIAL
 ***************************************************/
initMagasins();


