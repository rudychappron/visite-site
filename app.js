/***********************************************************
 * CONFIGURATION
 ***********************************************************/
const HERE_API_KEY = "5TuJy6GHPhdQDvXGdFa8Hq984DX0NsSGvl3dRZjx0uo";
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzcUr84EJSS0ngVtLT2d5NFSIp24hCJNDgAShacHvClGUW8Kek4ZtXVlJGekIy2shSUIw/exec";

/***********************************************************
 * CHARGEMENT DES MAGASINS
 ***********************************************************/
async function loadMagasins() {
  try {
    const url =
      APPS_SCRIPT_URL + "?origin=" +
      encodeURIComponent("https://rudychappron.github.io");

    const res = await fetch(url);
    const json = await res.json();

    if (!json.ok) {
      alert("Erreur API : " + (json.error || "inconnue"));
      return;
    }

    // Suppression de la première ligne = en-têtes
    window.magasins = json.data.slice(1);

    renderList();
  } catch (e) {
    console.error(e);
    alert("Erreur réseau : impossible de charger les magasins.");
  }
}

/***********************************************************
 * API HERE — DISTANCE & TEMPS
 ***********************************************************/
async function getRoute(lat1, lng1, lat2, lng2) {
  if (!lat2 || !lng2) return null;

  const url =
    `https://router.hereapi.com/v8/routes?transportMode=car&origin=${lat1},${lng1}` +
    `&destination=${lat2},${lng2}&return=summary&apikey=${HERE_API_KEY}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!json.routes) return null;

  const s = json.routes[0].sections[0].summary;

  return {
    km: (s.length / 1000).toFixed(1),
    minutes: Math.round(s.duration / 60)
  };
}

/***********************************************************
 * OUVRIR WAZE
 ***********************************************************/
function wazeLink(lat, lng) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/***********************************************************
 * AFFICHAGE VERSION LISTE
 ***********************************************************/
async function renderList() {
  const container = document.getElementById("list");
  if (!container) return;

  container.innerHTML = "Chargement…";

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const latUser = pos.coords.latitude;
    const lngUser = pos.coords.longitude;

    container.innerHTML = "";

    for (const m of window.magasins) {
      const lat = m[11];
      const lng = m[12];

      let route = null;
      if (lat && lng) {
        route = await getRoute(latUser, lngUser, lat, lng);
      }

      const card = document.createElement("div");
      card.className = "magasin-card";

      card.innerHTML = `
        <h3>${m[2] || "Nom manquant"}</h3>
        <p>${m[5] || ""} ${m[6] || ""} ${m[7] || ""}</p>

        ${
          route
            ? `<p>📍 ${route.km} km — ⏱ ${route.minutes} min</p>`
            : `<p>📍 Distance non disponible</p>`
        }

        <a href="${wazeLink(lat, lng)}" target="_blank" class="btn-waze">
          🚗 Waze
        </a>
      `;

      container.appendChild(card);
    }
  });
}

/***********************************************************
 * NAVIGATION ENTRE PAGES
 ***********************************************************/
function goAdd() {
  location.href = "add-magasin.html";
}

function goEdit(code) {
  localStorage.setItem("editCode", code);
  location.href = "edit-magasin.html";
}

/***********************************************************
 * DECONNEXION
 ***********************************************************/
function logout() {
  localStorage.removeItem("session");
  location.href = "index.html";
}

/***********************************************************
 * LANCEMENT AUTOMATIQUE
 ***********************************************************/
loadMagasins();
