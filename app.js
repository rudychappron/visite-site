/***********************************************************
 * CONFIGURATION
 ***********************************************************/
const HERE_API_KEY = "5TuJy6GHPhdQDvXGdFa8Hq984DX0NsSGvl3dRZjx0uo";
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzcUr84EJSS0ngVtLT2d5NFSIp24hCJNDgAShacHvClGUW8Kek4ZtXVlJGekIy2shSUIw/exec";

/***********************************************************
 * LECTURE FEUILLE GOOGLE SHEETS
 ***********************************************************/
async function loadMagasins() {
  try {
    const url =
      APPS_SCRIPT_URL +
      "?origin=" +
      encodeURIComponent("https://rudychappron.github.io") +
      "&action=get";

    const res = await fetch(url);
    const json = await res.json();

    if (!json.ok) {
      alert("Erreur API : " + (json.error || "inconnue"));
      return;
    }

    window.header = json.data[0];
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
    minutes: Math.round(s.duration / 60),
  };
}

/***********************************************************
 * WAZE LINK
 ***********************************************************/
function wazeLink(lat, lng) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/***********************************************************
 * METTRE À JOUR "VISITÉ"
 ***********************************************************/
async function toggleVisite(index, value) {
  window.magasins[index][1] = value; // col "fait"

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      index: index + 1,
      row: window.magasins[index],
    }),
  });

  console.log("Visité mis à jour !");
}

/***********************************************************
 * SUPPRESSION
 ***********************************************************/
async function deleteMagasin(index) {
  if (!confirm("Supprimer ce magasin ?")) return;

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "delete",
      index: index + 1,
    }),
  });

  window.magasins.splice(index, 1);
  renderList();
}

/***********************************************************
 * AFFICHAGE VERSION CARTES
 ***********************************************************/
async function renderList() {
  const container = document.getElementById("list");
  if (!container) return;

  container.innerHTML = "Chargement…";

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const latUser = pos.coords.latitude;
    const lngUser = pos.coords.longitude;

    container.innerHTML = "";

    for (let i = 0; i < window.magasins.length; i++) {
      const m = window.magasins[i];
      const lat = m[11];
      const lng = m[12];

      let route = null;
      if (lat && lng) route = await getRoute(latUser, lngUser, lat, lng);

      const card = document.createElement("div");
      card.className = "magasin-card";

      card.innerHTML = `
        <div class="mag-header">
          <h3>${m[2] || "Nom manquant"}</h3>

          <label class="visit-toggle">
            <input type="checkbox" ${m[1] ? "checked" : ""} 
                   onchange="toggleVisite(${i}, this.checked)">
            <span>Visité</span>
          </label>
        </div>

        <p class="adresse">${m[5] || ""} ${m[6] || ""} ${m[7] || ""}</p>

        ${
          route
            ? `<p class="distance">📍 ${route.km} km — ⏱ ${route.minutes} min</p>`
            : `<p class="distance">📍 Distance non disponible</p>`
        }

        <div class="actions">
          <a href="${wazeLink(lat, lng)}" target="_blank" class="btn-waze">
            🚗 Waze
          </a>

          <button class="btn-edit" onclick="goEdit('${m[0]}')">
            ✏️ Modifier
          </button>

          <button class="btn-delete" onclick="deleteMagasin(${i})">
            🗑️ Supprimer
          </button>
        </div>
      `;

      container.appendChild(card);
    }
  });
}

/***********************************************************
 * NAVIGATION
 ***********************************************************/
function goAdd() {
  location.href = "add-magasin.html";
}

function goEdit(code) {
  localStorage.setItem("editCode", code);
  location.href = "edit-magasin.html";
}

/***********************************************************
 * LOGOUT
 ***********************************************************/
function logout() {
  localStorage.removeItem("session");
  location.href = "index.html";
}

/***********************************************************
 * LANCEMENT
 ***********************************************************/
loadMagasins();
