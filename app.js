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
// GET — lire magasins
// =========================
async function getMagasins() {
    const res = await fetch(`${API}/get`, { method: "GET" });

    let json;
    try {
        json = await res.json();
    } catch (e) {
        console.error("❌ Impossible de lire la réponse Worker :", e);
        return [];
    }

    console.log("Réponse API brute :", json);

    if (Array.isArray(json)) return json;
    if (json.data) return json.data;

    return [];
}


// =========================
// DELETE magasin
// =========================
async function deleteMagasin(code) {
    await fetch(`${API}/delete`, {
        method: "POST",
        body: JSON.stringify({ code }),
        headers: { "Content-Type": "application/json" }
    });

    loadMagasins();
}


// =========================
// RENDER TABLE (route réelle ORS)
// =========================
async function loadMagasins() {
    const magasins = await getMagasins();
    if (!magasins || magasins.length === 0) {
        console.warn("⚠ Aucun magasin reçu !");
        return;
    }

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    for (const row of magasins.slice(1)) {

        const code = row[0] ?? "";
        const fait = row[1] ?? false;
        const nomComplet = row[2] ?? "";
        const type = row[3] ?? "";
        const adresse = row[5] ?? "";
        const cp = row[6] ?? "";
        const ville = row[7] ?? "";
        const lat = row[11] ?? null;
        const lng = row[12] ?? null;

        const adresseComplete = `${adresse} ${cp} ${ville}`.trim();

        // =============================
        // DISTANCE ROUTIÈRE (ORS)
        // =============================
        let distance = "-";

        if (lat && lng && window.userLat && window.userLng) {
            distance = await getRouteDistance(
                window.userLat,
                window.userLng,
                lat,
                lng
            );
        }

        // URL Waze
        const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${code}</td>
            <td>${fait ? "✔️" : ""}</td>
            <td>${nomComplet}</td>
            <td>${type}</td>
            <td>${adresseComplete}</td>

            <td>
                <a class="waze-btn" href="${wazeUrl}" target="_blank">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                        <rect width="512" height="512" rx="20" fill="#33CCFF"/>
                        <path fill="#FFFFFF" stroke="#000" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"
                            d="M256 120c-75 0-136 61-136 136 0 35 12 68 33 93l-10 40h52l-4-25c19 7 39 11 61 11s42-4 61-11l-4 25h52l-10-40c21-25 33-58 33-93 0-75-61-136-136-136z"/>
                        <circle cx="205" cy="250" r="22" fill="#000"/>
                        <circle cx="307" cy="250" r="22" fill="#000"/>
                        <path d="M205 320c18 20 46 30 75 30s57-10 75-30" stroke="#000" stroke-width="18" fill="none" stroke-linecap="round"/>
                        <circle cx="180" cy="360" r="30" fill="#000"/>
                        <circle cx="330" cy="360" r="30" fill="#000"/>
                    </svg>
                </a>
            </td>

            <td>${distance}</td>

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
function editMagasin(code) {
    window.location.href = `edit-magasin.html?code=${code}`;
}

function goAdd() {
    window.location.href = "add-magasin.html";
}


// =========================
// CHARGEMENT AUTO APRÈS GPS
// =========================
navigator.geolocation.getCurrentPosition(
    pos => {
        window.userLat = pos.coords.latitude;
        window.userLng = pos.coords.longitude;
        loadMagasins();
    },
    () => {
        console.warn("GPS refusé → chargement sans distance");
        loadMagasins();
    }
);
