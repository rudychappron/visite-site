/***********************************************************
 * CONFIGURATION
 ***********************************************************/
const HERE_API_KEY = "5TuJy6GHPhdQDvXGdFa8Hq984DX0NsSGvl3dRZjx0uo";
const ALLOWED_ORIGIN = "https://rudychappron.github.io";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw55iouMkIi2DH8yuKWzY2RGjjKL2Z9PvA0N1bakqVWyH6AeVshrL3kYLQZnVJLVLVOMw/exec";

/***********************************************************
 * CHARGER LES MAGASINS
 ***********************************************************/
async function loadMagasins() {
  try {
    const url =
      `${APPS_SCRIPT_URL}?action=get&origin=${encodeURIComponent(ALLOWED_ORIGIN)}`;

    const res = await fetch(url);
    const json = await res.json();

    if (!json.ok) {
      alert("Erreur API : " + (json.error || "inconnue"));
      return;
    }

    window.magasins = json.data.slice(1); // on retire l’en-tête
    initFilters();
    renderList();

  } catch (e) {
    console.error(e);
    alert("Erreur réseau : impossible de charger les magasins.");
  }
}

/***********************************************************
 * API HERE — ROUTE / TEMPS
 ***********************************************************/
async function getRoute(lat1, lng1, lat2, lng2) {
  if (!lat2 || !lng2) return null;

  const url =
    `https://router.hereapi.com/v8/routes?transportMode=car` +
    `&origin=${lat1},${lng1}` +
    `&destination=${lat2},${lng2}` +
    `&return=summary&apikey=${HERE_API_KEY}`;

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
 * LIEN WAZE
 ***********************************************************/
function wazeLink(lat, lng) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/***********************************************************
 * METTRE À JOUR "VISITÉ"
 ***********************************************************/
async function toggleVisite(index, checked) {

  // sécurité
  if (!window.magasins[index]) return;

  window.magasins[index][1] = checked;

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      index: index + 1,
      row: window.magasins[index]
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
      index: index + 1
    }),
  });

  window.magasins.splice(index, 1);
  renderList();
}

/***********************************************************
 * FILTRES
 ***********************************************************/
function initFilters() {
  const types = [...new Set(window.magasins.map(m => m[3]).filter(Boolean))];

  const select = document.getElementById("filterType");
  select.innerHTML = `<option value="all">Tous les types</option>`;

  types.forEach(t => {
    select.innerHTML += `<option value="${t}">${t}</option>`;
  });
}

function applyFilters(list) {

  const txt = document.getElementById("search").value.toLowerCase();
  const fVisite = document.getElementById("filterVisite").value;
  const fType = document.getElementById("filterType").value;

  // Recherche texte
  if (txt !== "") {
    list = list.filter(m =>
      (m[2] || "").toLowerCase().includes(txt) ||
      (m[5] || "").toLowerCase().includes(txt) ||
      (m[7] || "").toLowerCase().includes(txt)
    );
  }

  // Filtre Visité
  if (fVisite === "visite") list = list.filter(m => m[1] === true);
  if (fVisite === "nonvisite") list = list.filter(m => m[1] === false);

  // Filtre Type
  if (fType !== "all") {
    list = list.filter(m => (m[3] || "") === fType);
  }

  return list;
}

/***********************************************************
 * AFFICHAGE DES CARTES
 ***********************************************************/
async function renderList() {

  const container = document.getElementById("list");
  if (!container) return;
  container.innerHTML = "Chargement…";

  navigator.geolocation.getCurrentPosition(async pos => {

    const latUser = pos.coords.latitude;
    const lngUser = pos.coords.longitude;

    container.innerHTML = "";

    const filtered = applyFilters([...window.magasins]);

    filtered.forEach(async (m) => {

      const index = window.magasins.indexOf(m); // correct

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
                   onchange="toggleVisite(${index}, this.checked)">
            <span>Visité</span>
          </label>
        </div>

        <p class="adresse">${m[5] || ""} ${m[6] || ""} ${m[7] || ""}</p>

        ${route ?
          `<p class="distance">📍 ${route.km} km — ⏱ ${route.minutes} min</p>` :
          `<p class="distance">📍 Distance non disponible</p>`
        }

        <div class="actions">
          <a href="${wazeLink(lat, lng)}" target="_blank" class="btn-waze">Waze</a>
          <button class="btn-edit" onclick="goEdit('${m[0]}')">Modifier</button>
          <button class="btn-delete" onclick="deleteMagasin(${index})">Supprimer</button>
        </div>
      `;

      container.appendChild(card);
    });

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
