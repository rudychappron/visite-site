// ==============================
// CONFIG API
// ==============================
const API_URL =
  "https://script.google.com/macros/s/AKfycbyTaON-rMsTOV1tGAVpcaVfHWK9w7HzZjai7QXVvhSoADQ8V1AxStnVWG-2m1Jaqch1Pw/exec";

let magasins = [];
let userPosition = null;


// ==============================
// GEOLOCALISATION POUR KM
// ==============================
navigator.geolocation.getCurrentPosition(
  (pos) => {
    userPosition = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
    };
    if (location.href.includes("dashboard")) load();
  },
  () => {
    userPosition = null;
    if (location.href.includes("dashboard")) load();
  }
);


// Calcul de distance
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



// ==============================
// CHARGER LA LISTE
// ==============================
async function getMagasins() {
  const r = await fetch(API_URL);
  const j = await r.json();
  return j.data || [];
}

async function load() {
  magasins = await getMagasins();
  render(magasins);
}



// ==============================
// AFFICHAGE TABLEAU (PRO)
// ==============================
function render(list) {
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    list.slice(1).forEach(row => {
        const [
          code,
          visite,
          nom,
          type,
          adresse,
          cp,
          ville,
          lat,
          lon
        ] = row;

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
             <button class="action-btn" onclick="edit('${code}')">
                 <i class="fa-solid fa-pen"></i>
             </button>

             <button class="action-btn" onclick="del('${code}')">
                 <i class="fa-solid fa-trash"></i>
             </button>

             <button class="action-btn" onclick="waze('${adresse} ${cp} ${ville}')">
                 <i class="fa-brands fa-waze"></i>
             </button>
          </td>
        `;

        tbody.appendChild(tr);
    });
}



// ==============================
// RECHERCHE
// ==============================
function searchMagasins() {
  const v = search.value.toLowerCase();
  const filtered = magasins.filter(r => r.join(" ").toLowerCase().includes(v));
  render(filtered);
}



// ==============================
// NAVIGATION
// ==============================
function goAdd() {
  location.href = "add-magasin.html";
}



// ==============================
// AJOUTER
// ==============================
async function addMagasin() {
  const formData = new FormData();
  formData.append("action", "add");
  formData.append("code", code.value);
  formData.append("nom", nom.value);
  formData.append("type", type.value);
  formData.append("adresse", adresse.value);
  formData.append("cp", cp.value);
  formData.append("ville", ville.value);

  await fetch(API_URL, { method: "POST", body: formData });

  alert("Magasin ajouté !");
  location.href = "dashboard.html";
}



// ==============================
// EDITER
// ==============================
function edit(code) {
  localStorage.setItem("edit-code", code);
  location.href = "edit-magasin.html";
}



// ==============================
// CHARGER PAGE EDIT
// ==============================
async function fillEdit() {
  const codeToEdit = localStorage.getItem("edit-code");
  const data = await getMagasins();

  const row = data.find(r => r[0] == codeToEdit);

  if (!row) {
    alert("Code introuvable");
    location.href = "dashboard.html";
    return;
  }

  const [codeVal, nomVal, typeVal, adresseVal, cpVal, villeVal] = row;

  document.getElementById("code").value = codeVal;
  document.getElementById("nom").value = nomVal;
  document.getElementById("type").value = typeVal;
  document.getElementById("adresse").value = adresseVal;
  document.getElementById("cp").value = cpVal;
  document.getElementById("ville").value = villeVal;
}



// ==============================
// SAUVEGARDER MODIFICATION
// ==============================
async function saveEdit() {
  const formData = new FormData();
  formData.append("action", "edit");
  formData.append("code", code.value);
  formData.append("nom", nom.value);
  formData.append("type", type.value);
  formData.append("adresse", adresse.value);
  formData.append("cp", cp.value);
  formData.append("ville", ville.value);

  await fetch(API_URL, { method: "POST", body: formData });

  alert("Modifié !");
  location.href = "dashboard.html";
}



// ==============================
// SUPPRIMER
// ==============================
async function del(codeToDelete) {
  const formData = new FormData();
  formData.append("action", "delete");
  formData.append("code", codeToDelete);

  await fetch(API_URL, { method: "POST", body: formData });

  alert("Supprimé !");
  load();
}



// ==============================
// WAZE
// ==============================
function waze(adresse) {
  const url = "https://waze.com/ul?q=" + encodeURIComponent(adresse);
  location.href = url;
}



// ==============================
// VIDE CACHE PWA
// ==============================
function clearCache() {
  if ("caches" in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    alert("Cache vidé !");
  }
}



// ==============================
// AUTO-LOAD
// ==============================
if (location.href.includes("dashboard")) load();
if (location.href.includes("edit-magasin")) fillEdit();
