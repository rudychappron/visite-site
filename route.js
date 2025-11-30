/* ============================
   OPENROUTESERVICE — Distance Routière
   ============================ */

// 👉 Mets ta clé ici :
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImYzMzE4ODljM2Q2YTQzNjlhMzAwZDIxODRhOGNjZGMzIiwiaCI6Im11cm11cjY0In0=";  


/**
 * getRouteDistance(lat1, lng1, lat2, lng2)
 * Retourne la VRAIE distance routière en KM (arrondie)
 */
async function getRouteDistance(lat1, lng1, lat2, lng2) {
    try {
        const url = "https://api.openrouteservice.org/v2/directions/driving-car";

        const body = {
            coordinates: [
                [lng1, lat1],  // départ
                [lng2, lat2]   // arrivée
            ]
        };

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": ORS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const json = await res.json();

        if (!json.routes || !json.routes[0]) return null;

        const meters = json.routes[0].summary.distance;
        const km = meters / 1000;

        return km.toFixed(1) + " km";  

    } catch (e) {
        console.error("❌ ORS erreur :", e);
        return null;
    }
}
