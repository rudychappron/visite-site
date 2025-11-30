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
// CALCUL DISTANCE (km / m)
// =========================
function calculDistance(lat, lng) {
    if (!lat || !lng || !window.userLat || !window.userLng) return "-";

    const R = 6371;
    const dLat = (lat - window.userLat) * Math.PI / 180;
    const dLng = (lng - window.userLng) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(window.userLat * Math.PI / 180) *
        Math.cos(lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // < 1 km → m
    if (d < 1) {
        return Math.round(d * 1000) + " m";
    }

    // ≥ 1 km
    return Math.round(d) + " km";
}


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
// RENDER TABLE
// =========================
async function loadMagasins() {
    const magasins = await getMagasins();
    if (!magasins || magasins.length === 0) {
        console.warn("⚠ Aucun magasin reçu !");
        return;
    }

    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    magasins.slice(1).forEach(row => {

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
        const distance = calculDistance(lat, lng);

        // Lien Waze
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
                    <i class="fa-brands fa-waze"></i>
                </a>
            </td>

            <td>${distance}</td>

            <td>
                <button onclick="editMagasin('${code}')">✏️</button>
                <button onclick="deleteMagasin('${code}')">🗑</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
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
        loadMagasins(); // 🔥 charger après GPS
    },
    () => {
        console.warn("GPS refusé → distances impossibles");
        loadMagasins(); // charge quand même
    }
);
