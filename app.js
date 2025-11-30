// =========================
// API Secure Worker
// =========================

const API = "https://winter-bar-234b.rudychappron.workers.dev";

// -------------------------
// GET — lire les magasins
// -------------------------
async function getMagasins() {
    const res = await fetch(`${API}/get`, {
        method: "GET",
    });

    const data = await res.json();
    console.log("Magasins :", data);
    return data;
}

// -------------------------
// ADD — ajouter un magasin
// -------------------------
async function addMagasin(row) {
    await fetch(`${API}/add`, {
        method: "POST",
        body: JSON.stringify(row),
        headers: {
            "Content-Type": "application/json"
        }
    });
}

// -------------------------
// UPDATE — à implémenter plus tard
// -------------------------
async function updateMagasin(row) {
    await fetch(`${API}/update`, {
        method: "POST",
        body: JSON.stringify(row)
    });
}

// -------------------------
// DELETE — à implémenter plus tard
// -------------------------
async function deleteMagasin(row) {
    await fetch(`${API}/delete`, {
        method: "POST",
        body: JSON.stringify(row)
    });
}

// -------------------------------------
// Exemple d’appel (à supprimer ensuite)
// -------------------------------------
async function testAPI() {
    const magasins = await getMagasins();
    console.log("Test API OK ✔", magasins);
}

testAPI();
