console.log("📍 GEOCODE.JS CHARGÉ ✔");

const WORKER_GEO_URL = "https://winter-bar-234b.rudychappron.workers.dev/geo";

/**
 * Géocode une adresse → retourne { lat, lng }
 */
async function geocodeAdresse(adresse) {
    try {
        const res = await fetch(WORKER_GEO_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: adresse })
        });

        const json = await res.json();

        if (!json[0]) {
            console.warn("⚠️ Adresse introuvable :", adresse);
            return null;
        }

        return {
            lat: parseFloat(json[0].lat),
            lng: parseFloat(json[0].lon)
        };

    } catch (err) {
        console.error("❌ Erreur géocodage via Worker :", err);
        return null;
    }
}
