const HERE_API_KEY = "5TuJy6GHPhdQDvXGdFa8Hq984DX0NsSGvl3dRZjx0uo";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzcUr84EJSS0ngVtLT2d5NFSIp24hCJNDgAShacHvClGUW8Kek4ZtXVlJGekIy2shSUIw/exec";

// =============================
// Charger les magasins
// =============================
async function loadMagasins() {
    const res = await fetch(APPS_SCRIPT_URL + "?origin=" + encodeURIComponent(location.origin));
    const json = await res.json();

    if (!json.ok) {
        alert("Erreur de chargement");
        return;
    }

    const rows = json.data;
    const header = rows[0];
    const data = rows.slice(1);

    window.magasins = data;
    renderMagasins();
}

// =============================
// Distance + Temps (HERE API)
// =============================
async function getRoute(lat1, lng1, lat2, lng2) {
    const url =
        `https://router.hereapi.com/v8/routes?transportMode=car&origin=${lat1},${lng1}&destination=${lat2},${lng2}&return=summary&apikey=${HERE_API_KEY}`;

    const res = await fetch(url);
    const json = await res.json();

    if (!json.routes) return null;

    const summary = json.routes[0].sections[0].summary;

    return {
        km: (summary.length / 1000).toFixed(1),
        minutes: Math.round(summary.duration / 60)
    };
}

// =============================
// Bouton Waze
// =============================
function wazeLink(lat, lng) {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

// =============================
// Affichage magasins
// =============================
async function renderMagasins() {
    navigator.geolocation.getCurrentPosition(async pos => {
        const latUser = pos.coords.latitude;
        const lngUser = pos.coords.longitude;

        const list = document.getElementById("list");
        list.innerHTML = "";

        for (const m of window.magasins) {
            const lat = m[11];
            const lng = m[12];

            let route = null;
            if (lat && lng) {
                route = await getRoute(latUser, lngUser, lat, lng);
            }

            const div = document.createElement("div");
            div.className = "magasin";

            div.innerHTML = `
                <h3>${m[2]}</h3>
                <p>${m[5]} ${m[6]} ${m[7]} </p>
                ${route ? `
                    <p>📍 ${route.km} km — ⏱ ${route.minutes} min</p>
                ` : ""}
                <a href="${wazeLink(lat,lng)}" target="_blank" class="btn">🚗 Waze</a>
            `;

            list.appendChild(div);
        }
    });
}

// Lancer
loadMagasins();
