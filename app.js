/***************************************************
 * CONFIG — OSRM WORKER VERSION
 ***************************************************/
const API = "https://winter-bar-234b.rudychappron.workers.dev";

window.userLat = null;
window.userLng = null;

let gpsReady = false;
let gpsInitDone = false; // empêche double appel

let sortCol = null;
let sortAsc = true;

let addressCache = {};
let fullMagList = [];
let typeList = [];


/***************************************************
 * NORMALISATION ADRESSE + CACHE
 ***************************************************/
async function normalizeAddress(a, cp, v) {
    const key = a + cp + v;

    if (addressCache[key]) return addressCache[key];

    try {
        const res = await fetch(`${API}/geo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: `${a}, ${cp} ${v}` })
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
 * GET MAGASINS — OSRM + Tri serveur
 ***************************************************/
async function getMagasins() {
    try {
        const res = await fetch(`${API}/get?lat=${window.userLat}&lng=${window.userLng}`);
        const json = await res.json();

        return json.data || [];

    } catch {
        console.warn("Erreur GET /get");
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
        body: JSON.stringify({ code, fait: el.checked })
    });
}


/***************************************************
 * TRI LOCAL
 ***************************************************/
function sortBy(col) {
    if (sortCol === col) sortAsc = !sortAsc;
    else { sortCol = col; sortAsc = true; }

    renderTable();
}


/***************************************************
 * RECHERCHE + FILTRES
 ***************************************************/
function onSearchChange() { renderTable(); }
function onFilterChange() { renderTable(); }


/***************************************************
 * RENDER TABLE — SUPER OPTIMISÉ
 ***************************************************/
async function renderTable() {

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
        vol: r.vol,    // dist vol (serveur)
        km: r.km,      // route km (serveur)
        duree: r.duree // temps route (serveur)
    }));


    /******** Recherche ********/
    list = list.filter(m =>
        m.code.toString().includes(search) ||
        m.nom.toLowerCase().includes(search) ||
        m.type.toLowerCase().includes(search) ||
        m.ville.toLowerCase().includes(search)
    );

    /******** Filtre visite ********/
    if (fVisite === "visite") list = list.filter(m => m.visite);
    if (fVisite === "nonvisite") list = list.filter(m => !m.visite);

    /******** Filtre type ********/
    if (fType !== "all") list = list.filter(m => m.type === fType);

    /******** TRI LOCAL (optionnel) ********/
    if (sortCol === "code") list.sort((a,b)=> sortAsc ? a.code - b.code : b.code - a.code);
    if (sortCol === "nom") list.sort((a,b)=> sortAsc ? a.nom.localeCompare(b.nom) : b.nom.localeCompare(a.nom));
    if (sortCol === "type") list.sort((a,b)=> sortAsc ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type));
    if (sortCol === "visite") list.sort((a,b)=> sortAsc ? a.visite - b.visite : b.visite - a.visite);


    /******** Rendu ********/
    for (const m of list) {

        const fullAdr = await normalizeAddress(m.adresse, m.cp, m.ville);
        const waze = `https://waze.com/ul?ll=${m.lat},${m.lng}&navigate=yes`;

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${m.code}</td>

            <td><input type="checkbox" ${m.visite ? "checked" : ""}
                       onchange="toggleVisite('${m.code}', this)"></td>

            <td>${m.nom}</td>
            <td>${m.type}</td>
            <td>${fullAdr}</td>

            <td>
                <a href="${waze}" target="_blank">
                    <img src="https://files.brandlogos.net/svg/KWGOdcgoGJ/waze-app-icon-logo-brandlogos.net_izn3bglse.svg" width="30">
                </a>
            </td>

            <td>${m.vol ? m.vol.toFixed(1) + " km" : "-" }</td>
            <td>${m.km || "-"}</td>
            <td>${m.duree || "-"}</td>

            <td><button onclick="editMagasin('${m.code}')">✏️</button></td>
        `;

        tbody.appendChild(tr);
    }
}


/***************************************************
 * INIT — Chargée UNE SEULE FOIS
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
        lng: Number(r[12]),
        vol: Number(r[13]),
        km: r[14],
        duree: r[15]
    }));


    /**** Types dynamiques ****/
    typeList = [...new Set(fullMagList.map(m => m.type).filter(Boolean))];
    const sel = document.getElementById("filterType");
    sel.innerHTML = `<option value="all">Tous les types</option>`;
    typeList.sort().forEach(t => sel.innerHTML += `<option value="${t}">${t}</option>`);

    renderTable();
}


/***************************************************
 * GPS — NE LANCE INIT QU’UNE FOIS
 ***************************************************/
navigator.geolocation.watchPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;

        if (!gpsInitDone) {
            gpsInitDone = true;
            initMagasins();  // 1 seule fois
        }
    },
    err => console.warn("GPS refusé:", err),
    { enableHighAccuracy: true }
);


/***************************************************
 * NAVIGATION
 ***************************************************/
function editMagasin(code) { location.href = `edit-magasin.html?code=${code}`; }
function goAdd() { location.href = "add-magasin.html"; }
function clearCache() { addressCache = {}; alert("Cache vidé ✔"); }
