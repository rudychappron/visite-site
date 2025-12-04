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
let sortDistance = "asc";

/***********************************************************
 * FORMAT TEMPS (minutes → "X min" ou "XhYY")
 ***********************************************************/
function formatTime(min) {
  if (min < 60) return `${min} min`;

  const h = Math.floor(min / 60);
  const m = min % 60;

  if (m === 0) return `${h}h00`;
  if (m < 10) return `${h}h0${m}`;

  return `${h}h${m}`;
}

/***********************************************************
 * WAZE ULTRA PRÉCIS (Adresse → fallback GPS)
 ***********************************************************/
function openWaze(m) {

  const clean = txt =>
    (txt || "")
      .normalize("NFKD")
      .replace(/[^\w\s\-\,]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  const rue = clean(m.data[5]);
  const cp = clean(m.data[6]);
  const ville = clean(m.data[7]);

  const adr = `${rue}, ${cp} ${ville}, France`;
  const encoded = encodeURIComponent(adr);

  let url = `https://waze.com/ul?q=${encoded}&navigate=yes`;

  if (!rue || rue.length < 3) {
    const lat = m.data[11];
    const lng = m.data[12];

    if (lat && lng)
      url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    else {
      alert("Aucune adresse ou coordonnée disponible.");
      return;
    }
  }

  window.open(url, "_blank");
}

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
      routeInfo: null,
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
      row: mag.data,
    }),
  });
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
      origin: ALLOWED_ORIGIN,
    }),
  });

  window.magasins.splice(realIndex, 1);
  renderList();
}

/***********************************************************
 * API ROUTE HERE (Distance + Temps)
 ***********************************************************/
async function getRoute(lat1, lng1, lat2, lng2) {
  if (!lat2 || !lng2) return null;

  const url =
    `https://router.hereapi.com/v8/routes?transportMode=car` +
    `&origin=${lat1},${lng1}` +
    `&destination=${lat2},${lng2}` +
    `&return=summary&apikey=${HERE_API_KEY}`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (!json || !json.routes || !json.routes[0]?.sections?.[0]) return null;

    const s = json.routes[0].sections[0].summary;

    return {
      km: (s.length / 1000).toFixed(1),
      minutes: Math.round(s.duration / 60),
    };

  } catch (e) {
    return null;
  }
}

/***********************************************************
 * TRI DISTANCE
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
 * COPIE CODE
 ***********************************************************/
function copyCode(code) {
  navigator.clipboard.writeText(code);
  alert("Code magasin copié : " + code);
}

/***********************************************************
 * AFFICHAGE (liste magasins)
 ***********************************************************/
async function renderList() {

  const container = document.getElementById("list");
  container.innerHTML = "Chargement…";

  navigator.geolocation.getCurrentPosition(async pos => {

    const latUser = pos.coords.latitude;
    const lngUser = pos.coords.longitude;

    container.innerHTML = "";

    let filtered = applyFilters([...window.magasins]);

    for (const m of filtered) {
      const lat = m.data[11];
      const lng = m.data[12];

      if (lat && lng) {
        const route = await getRoute(latUser, lngUser, lat, lng);
        m.distanceKm = route ? parseFloat(route.km) : null;
        m.routeInfo = route;
      } else {
        m.distanceKm = null;
      }
    }

    if (sortDistance === "asc") {
      filtered.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    }
    if (sortDistance === "desc") {
      filtered.sort((a, b) => (b.distanceKm ?? -1) - (a.distanceKm ?? -1));
    }

    for (const m of filtered) {

      const row = m.data;
      const index = window.magasins.indexOf(m);

      const card = document.createElement("div");
      card.className = "magasin-card";

      card.innerHTML = `
        <div class="mag-header">
          <h3>
            ${row[2] || "Nom manquant"}  
            <span class="code-magasin" onclick="copyCode('${row[0]}')">
              (#${row[0]})
            </span>
          </h3>

          <label class="visit-toggle">
            <input type="checkbox" ${row[1] ? "checked" : ""} 
                   onchange="toggleVisite(${index}, this.checked)">
            <span>Visité</span>
          </label>
        </div>

        <p class="adresse">${row[5]} ${row[6]} ${row[7]}</p>

        ${
          m.routeInfo
          ? `<p class="distance">📍 ${m.routeInfo.km} km | ⏱ ${formatTime(m.routeInfo.minutes)}</p>`
          : `<p class="distance">📍 Distance inconnue</p>`
        }

        <div class="actions">

          <button class="btn-waze" onclick="openWaze(window.magasins[${index}])">
            Waze
          </button>

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
function goAdd() { location.href = "add-magasin.html"; }
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
