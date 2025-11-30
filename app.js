// =========================
// API Secure Worker
// =========================
const API = "https://winter-bar-234b.rudychappron.workers.dev";

// =========================
// POSITION GPS UTILISATEUR
// =========================
window.userLat = null;
window.userLng = null;

// MODE AFFICHAGE : 5 proches ou tout
let modeProximite = true;


// =======================================
// 🔥 HAVERSINE – Distance "à vol d’oiseau"
// =======================================
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // rayon Terre
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km
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
// NORMALISATION ADRESSE (via Worker /geo)
// =========================
async function normalizeAddress(adresse, cp, ville) {
    const full = `${adresse}, ${cp} ${ville}`;

    try {
        const res = await fetch(`${API}/geo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: full })
        });

        const json = await res.json();

        if (json && json.length > 0) {
            return json[0].display_name;
        }

        return full;

    } catch (e) {
        console.warn("⚠️ Normalisation échouée :", e);
        return full;
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
// UPDATE VISITE (popup)
// =========================
async function toggleVisite(code, checkboxElement) {

    const newState = checkboxElement.checked;
    const ok = confirm(newState
        ? "Marquer ce magasin comme VISITÉ ?"
        : "Marquer ce magasin comme NON VISITÉ ?");

    if (!ok) {
        checkboxElement.checked = !newState;
        return;
    }

    try {
        await fetch(`${API}/updateVisite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, fait: newState })
        });
    } catch {
        alert("Erreur !");
        checkboxElement.checked = !newState;
    }
}



// =========================
// RENDER TABLE — VERSION PRO
// =========================
async function loadMagasins() {
    const magasins = await getMagasins();
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    if (!window.userLat || !window.userLng) {
        console.warn("⛔ Position non prête");
        return;
    }

    // 1️⃣ Ajouter distance Haversine à chaque ligne
    let list = magasins.slice(1).map(row => {
        const lat = row[11];
        const lng = row[12];
        let d = 9999;
        if (lat && lng) d = haversine(window.userLat, window.userLng, lat, lng);

        return {
            row,
            dist: d
        };
    });

    // 2️⃣ Trier du plus proche au plus loin
    list.sort((a, b) => a.dist - b.dist);

    // 3️⃣ Si mode "5 proches", on réduit
    let toDisplay = modeProximite ? list.slice(0, 5) : list;


    // 4️⃣ Générer l'affichage
    for (const item of toDisplay) {

        const row = item.row;

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

        // ORS uniquement sur les 5 affichés → RAPIDE ⚡
        let kmTxt = "-";
        let tempsTxt = "-";

        if (lat && lng) {
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
                <a href="${wazeUrl}" target="_blank">
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
// RAFRAÎCHIR POSITION
// =========================
async function refreshPosition() {
    navigator.geolocation.getCurrentPosition(
        pos => {
            window.userLat = pos.coords.latitude;
            window.userLng = pos.coords.longitude;
            loadMagasins();
        },
        () => console.warn("GPS refusé")
    );
}



// =========================
// NAVIGATION
// =========================
function editMagasin(code) { location.href = `edit-magasin.html?code=${code}`; }
function goAdd() { location.href = "add-magasin.html"; }


// =========================
// TOGGLE PROXIMITÉ
// =========================
function toggleView() {
    modeProximite = !modeProximite;
    loadMagasins();
}



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
