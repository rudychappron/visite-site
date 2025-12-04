/***********************************************************
 * CONFIGURATION
 ***********************************************************/
const HERE_API_KEY = "5TuJy6GHPhdQDvXGdFa8Hq984DX0NsSGvl3dRZjx0uo";
const ALLOWED_ORIGIN = "https://rudychappron.github.io";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxamWQ5gx9ofSAwYMttyOjsju_XSdDgHdTBFtksLkXPH50WPmqp0AYHZAIq0o_KR4ZMyQ/exec";

/***********************************************************
 * VARIABLES
 ***********************************************************/
let sortDistance = "none"; // "none" | "asc" | "desc"

/***********************************************************
 * CHARGEMENT MAGASINS
 ***********************************************************/
async function loadMagasins() {
  try {
    const url = `${APPS_SCRIPT_URL}?action=get&origin=${encodeURIComponent(ALLOWED_ORIGIN)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.ok) {
      alert("Erreur API");
      return;
    }

    window.magasins = json.data.slice(1).map((row, idx) => ({
      rowIndex: idx,
      data: row,
      distanceKm: null,
      routeInfo: null
    }));

    initFilters();
    renderList();

  } catch (e) {
    console.error(e);
    alert("Erreur réseau");
  }
}

/***********************************************************
 * UPDATE VISITÉ
 ***********************************************************/
async function toggleVisite(index, checked) {
  const mag = window.magasins[index];
  if (!mag) return;

  mag.data[1] = checked;

  await fetch(APPS_SCRIPT_URL + "?origin=" + ALLOWED_ORIGIN, {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      index: mag.rowIndex,
      row: mag.data
    })
  });

  console.log("Visité mis à jour !");
}

/***********************************************************
 * SUPPRIMER
 ***********************************************************/
async function deleteMagasin(realIndex) {
  const mg = window.magasins[realIndex];

  if (!confirm("Supprimer ce magasin ?")) return;

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "delete",
      index: mg.rowIndex,
      origin: ALLOWED_ORIGIN
    })
  });

  window.magasins.splice(realIndex, 1);
  renderList();
}

/***********************************************************
 * API ROUTE HERE
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
 * CHANGEMENT TRI DISTANCE (menu déroulant)
 ***********************************************************/
function changeSortDistance() {
  sortDistance = document.getElementById("sortDistanceSelect").value;
  renderList();
}

/***********************************************************
 * FILTRES
 ***********************************************************/
function initFilters() {
  const types = [...new Set(window.magasins.map(m => m.data[3]).filter(Boolean))];
  const sel = document.getElementById("filterType");

  sel.innerHTML = `<option value="all">Tous les types</option>`;
  types.forEach(t => sel.innerHTML += `<option value="${t}">${t}</option>`);
}

function applyFilters(list) {
  const txt = document.getElementById("search").value.toLowerCase();
  const fVisite = document.getElementById("filterVisite").value;
  const fType = document.getElementById("filterType").value;

  if (txt)
    list = list.filter(m =>
      (m.data[2] || "").toLowerCase().includes(txt) ||
      (m.data[5] || "").toLowerCase().includes(txt) ||
      (m.data[7] || "").toLowerCase().includes(txt)
    );

  if (fVisite === "visite") list = list.filter(m => m.data[1] === true);
  if (fVisite === "nonvisite") list = list.filter(m => m.data[1] === false);

  if (fType !== "all")
    list = list.filter(m => m.data[3] === fType);

  return list;
}

/***********************************************************
 * AFFICHAGE LISTE + TRI PAR DISTANCE
 ***********************************************************/
async function renderList() {

  const container = document.getElementById("list");
  container.innerHTML = "Chargement…";

  navigator.geolocation.getCurrentPosition(async pos => {

    const latUser = pos.coords.latitude;
    const lngUser = pos.coords.longitude;

    container.innerHTML = "";

    let filtered = applyFilters([...window.magasins]);

    // Calcul distance + stockage
    for (const m of filtered) {
      const lat = m.data[11];
      const lng = m.data[12];

      if (lat && lng) {
        const route = await getRoute(latUser, lngUser, lat, lng);
        m.distanceKm = route ? parseFloat(route.km) : null;
        m.routeInfo = route;
      } else {
        m.distanceKm = null;
        m.routeInfo = null;
      }
    }

    // TRI
    if (sortDistance === "asc") {
      filtered.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    if (sortDistance === "desc") {
      filtered.sort((a, b) => {
        if (a.distanceKm == null) return -1;
        if (b.distanceKm == null) return 1;
        return b.distanceKm - a.distanceKm;
      });
    }

    // AFFICHAGE
    for (const m of filtered) {

      const row = m.data;
      const index = window.magasins.indexOf(m);

      const card = document.createElement("div");
      card.className = "magasin-card";

      card.innerHTML = `
        <div class="mag-header">
          <h3>${row[2] || "Nom manquant"}</h3>

          <label class="visit-toggle">
            <input type="checkbox" ${row[1] ? "checked" : ""} 
                   onchange="toggleVisite(${index}, this.checked)">
            <span>Visité</span>
          </label>
        </div>

        <p class="adresse">${row[5]} ${row[6]} ${row[7]}</p>

        ${
          m.routeInfo
          ? `<p class="distance">📍 ${m.routeInfo.km} km | ⏱ ${m.routeInfo.minutes} min</p>`
          : `<p class="distance">📍 Distance inconnue</p>`
        }

        <div class="actions">
          <a href="https://waze.com/ul?ll=${row[11]},${row[12]}&navigate=yes"
             target="_blank" class="btn-waze">Waze</a>

          <button class="btn-edit" onclick="goEdit('${row[0]}')">
            Modifier
          </button>

          <button class="btn-delete" onclick="deleteMagasin(${index})">
            Supprimer
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
function logout() {
  localStorage.removeItem("session");
  location.href = "index.html";
}

/***********************************************************
 * LANCEMENT
 ***********************************************************/
loadMagasins();
