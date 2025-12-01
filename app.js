/***********************************************************
 * CONFIGURATION
 ***********************************************************/
const HERE_API_KEY = "5TuJy6GHPhdQDvXGdFa8Hq984DX0NsSGvl3dRZjx0uo";
const ALLOWED_ORIGIN = "https://rudychappron.github.io";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwSHdLecIBM3RcVFyzQpm8Xrj2aKiyK-seP6upTjY0Wf-CWklBDdBr9x5DlbVx4znafGQ/exec";

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

    // ⭐ ON GARDE AUSSI L'INDEX D'ORIGINE
    window.magasins = json.data.slice(1).map((row, idx) => ({
      rowIndex: idx,   // index réel de la ligne dans Sheets (0-based)
      data: row
    }));

    initFilters();
    renderList();

  } catch (e) {
    console.error(e);
    alert("Erreur réseau");
  }
}

/***********************************************************
 * UPDATE VISITÉ – 100% FIABLE
 ***********************************************************/
async function toggleVisite(index, checked) {

  const row = window.magasins[index];
  row[1] = checked;

  console.log("== DEBUG VISITE ==");
  console.log("INDEX ENVOYÉ :", index);
  console.log("CODE :", row[0]);

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      index: index,
      row,
      origin: ALLOWED_ORIGIN
    })
  });

  console.log("Visité mis à jour !");
}

/***********************************************************
 * SUPPRESSION
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
 * WAZE
 ***********************************************************/
function wazeLink(lat, lng) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
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
 * AFFICHAGE LISTE
 ***********************************************************/
async function renderList() {

  const container = document.getElementById("list");
  container.innerHTML = "Chargement…";

  navigator.geolocation.getCurrentPosition(async pos => {

    container.innerHTML = "";
    const filtered = applyFilters([...window.magasins]);

    for (const mg of filtered) {

      const index = window.magasins.indexOf(mg);
      const m = mg.data;

      const lat = m[11];
      const lng = m[12];

      let route = null;
      if (lat && lng) route = await getRoute(pos.coords.latitude, pos.coords.longitude, lat, lng);

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

        <p class="adresse">${m[5]} ${m[6]} ${m[7]}</p>

        ${route ? `<p class="distance">📍 ${route.km} km | ⏱ ${route.minutes} min</p>` :
          `<p class="distance">📍 Distance inconnue</p>`}

        <div class="actions">
          <a href="${wazeLink(lat, lng)}" target="_blank" class="btn-waze">Waze</a>
          <button class="btn-edit" onclick="goEdit('${m[0]}')">Modifier</button>
          <button class="btn-delete" onclick="deleteMagasin(${index})">Supprimer</button>
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
