/****************************************************
 * CHARGEMENT DES MAGASINS
 ****************************************************/
let magasins = [];
let userPosition = null;

// --- Geolocalisation ---
navigator.geolocation.getCurrentPosition(
  (pos) => {
    userPosition = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    if (location.href.includes("dashboard")) loadMagasins();
  },
  () => {
    userPosition = null;
    if (location.href.includes("dashboard")) loadMagasins();
  }
);

// --- Distance en KM ---
function distanceKM(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return "-";

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}


/****************************************************
 * RÉCUPÉRER & AFFICHER LA LISTE
 ****************************************************/
async function loadMagasins() {
  magasins = await getMagasins(); // vient de app-secure.js
  renderTable(magasins);
}

function renderTable(list) {
  const tbody = document.querySelector("tbody");
  tbody.innerHTML = "";

  list.slice(1).forEach((row) => {
    const [code, visite, nom, type, adresse, cp, ville, lat, lon] = row;

    const km = userPosition
      ? distanceKM(userPosition.lat, userPosition.lon, lat, lon)
      : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${code}</td>
        <td class="${visite === "true" ? "visited" : "not-visited"}">
            ${visite === "true" ? "✓" : "—"}
        </td>
        <td>${nom}</td>
        <td>${type}</td>
        <td>${adresse}</td>
        <td>${ville}</td>
        <td>${km} km</td>
        <td>
            <button class="btn-edit" onclick="edit('${code}')">✏</button>
            <button class="btn-del" onclick="delMagasin('${code}')">🗑</button>
            <button class="btn-waze" onclick="waze('${adresse} ${cp} ${ville}')">🚗</button>
        </td>
    `;
    tbody.appendChild(tr);
  });
}


/****************************************************
 * RECHERCHE
 ****************************************************/
function searchMagasins() {
  const v = search.value.toLowerCase();
  const filtered = magasins.filter((r) =>
    r.join(" ").toLowerCase().includes(v)
  );
  renderTable(filtered);
}


/****************************************************
 * NAVIGATION
 ****************************************************/
function goAdd() {
  location.href = "add-magasin.html";
}


/****************************************************
 * AJOUT MAGASIN
 ****************************************************/
async function addMagasin() {
  await addMagasinSecure(
    code.value,
    nom.value,
    type.value,
    adresse.value,
    cp.value,
    ville.value
  );

  alert("Magasin ajouté !");
  location.href = "dashboard.html";
}


/****************************************************
 * ÉDITION MAGASIN
 ****************************************************/
function edit(codeMag) {
  localStorage.setItem("edit-code", codeMag);
  location.href = "edit-magasin.html";
}

async function fillEdit() {
  const codeToEdit = localStorage.getItem("edit-code");
  const data = await getMagasins();
  const row = data.find((r) => r[0] == codeToEdit);

  if (!row) {
    alert("Code introuvable");
    location.href = "dashboard.html";
    return;
  }

  const [codeVal, nomVal, typeVal, adresseVal, cpVal, villeVal] = row;

  code.value = codeVal;
  nom.value = nomVal;
  type.value = typeVal;
  adresse.value = adresseVal;
  cp.value = cpVal;
  ville.value = villeVal;
}

async function saveEdit() {
  await editMagasinSecure(
    code.value,
    nom.value,
    type.value,
    adresse.value,
    cp.value,
    ville.value
  );

  alert("Modifications enregistrées !");
  location.href = "dashboard.html";
}


/****************************************************
 * SUPPRESSION
 ****************************************************/
async function delMagasin(codeMag) {
  if (!confirm("Supprimer ce magasin ?")) return;

  await deleteMagasinSecure(codeMag);

  alert("Supprimé !");
  loadMagasins();
}


/****************************************************
 * WAZE
 ****************************************************/
function waze(addr) {
  location.href = "https://waze.com/ul?q=" + encodeURIComponent(addr);
}


/****************************************************
 * VIDAGE CACHE
 ****************************************************/
function clearCache() {
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    alert("Cache vidé !");
  }
}


/****************************************************
 * AUTO-LOAD DES PAGES
 ****************************************************/
if (location.href.includes("dashboard")) loadMagasins();
if (location.href.includes("edit-magasin")) fillEdit();
