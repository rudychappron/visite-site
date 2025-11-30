/* ============================
   ORS via ton Worker sécurisé
   ============================ */

const WORKER_URL = "https://winter-bar-234b.rudychappron.workers.dev/ors";

/**
 * getRouteDistance(lat1, lng1, lat2, lng2)
 * → Retourne la distance routière en km via ton Worker
 */
async function getRouteDistance(lat1, lng1, lat2, lng2) {
    try {
        const payload = {
            coordinates: [
                [lng1, lat1],   // départ
                [lng2, lat2]    // arrivée
            ]
        };

        const res = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error("❌ Erreur Worker ORS:", res.status);
            return null;
        }

        const json = await res.json();

        if (!json.routes || !json.routes[0]) {
            console.error("⚠️ Réponse ORS invalide via Worker", json);
            return null;
        }

        const meters = json.routes[0].summary.distance;
        const km = meters / 1000;

        return km.toFixed(1) + " km";

    } catch (err) {
        console.error("❌ getRouteDistance() erreur :", err);
        return null;
    }
}
