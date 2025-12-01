/***********************************************************
 * CONFIG
 ***********************************************************/
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxamWQ5gx9ofSAwYMttyOjsju_XSdDgHdTBFtksLkXPH50WPmqp0AYHZAIq0o_KR4ZMyQ/exec";
const ALLOWED_ORIGIN = "https://rudychappron.github.io";

const HERE_API_KEY = "5TuJy6GHPhdQDvXGdFa8Hq984DX0NsSGvl3dRZjx0uo";

/***********************************************************
 * GÉOCODAGE HERE (ADRESSE → LAT / LNG)
 ***********************************************************/
async function geocode(adresse) {

  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(adresse)}&apikey=${HERE_API_KEY}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!json.items || json.items.length === 0) return null;

  return {
    lat: json.items[0].position.lat,
    lng: json.items[0].position.lng
  };
}

/***********************************************************
 * CHARGER LE MAGASIN EN ÉDITION
 ***********************************************************/
let currentMag = null;

async function loadMagasin() {
  const code = localStorage.getItem("editCode");

  if (!code) {
    alert("Aucun magasin sélectionné !");
    location.href = "dashboard.html";
    return;
  }

  const res = await fetch(APPS_SCRIPT_URL + "?action=get&origin=" + ALLOWED_ORIGIN);
  const json = await res.json();

  if (!json.ok) {
    alert("Erreur API");
    return;
  }

  const rows = json.data.slice(1); // enlève entête
  const idx = rows.findIndex(r => r[0] == code);

  if (idx === -1) {
    alert("Magasin introuvable !");
    location.href = "dashboard.html";
    return;
  }

  // Structure identique à App.js
  currentMag = {
    rowIndex: idx,   // index réel ligne (0 = ligne 2)
    data: rows[idx]
  };

  // Remplir formulaire
  document.getElementById("code").value = currentMag.data[0];
  document.getElementById("nom").value = currentMag.data[2] || "";
  document.getElementById("type").value = currentMag.data[3] || "";
  document.getElementById("adresse").value = currentMag.data[5] || "";
  document.getElementById("cp").value = currentMag.data[6] || "";
  document.getElementById("ville").value = currentMag.data[7] || "";
}

/***********************************************************
 * SAUVEGARDE + GÉOCODAGE
 ***********************************************************/
async function saveEdit() {

  if (!currentMag) {
    alert("Erreur interne : aucun magasin chargé !");
    return;
  }

  // Construire adresse complète
  const adrComplete =
    `${document.getElementById("adresse").value} ` +
    `${document.getElementById("cp").value} ` +
    `${document.getElementById("ville").value}`;

  // Géocodage (lat / lng)
  const gps = await geocode(adrComplete);

  if (gps) {
    currentMag.data[11] = gps.lat;  // LATITUDE
    currentMag.data[12] = gps.lng;  // LONGITUDE
  }

  // Mise à jour des autres colonnes
  currentMag.data[0] = document.getElementById("code").value;
  currentMag.data[2] = document.getElementById("nom").value;
  currentMag.data[3] = document.getElementById("type").value;
  currentMag.data[5] = document.getElementById("adresse").value;
  currentMag.data[6] = document.getElementById("cp").value;
  currentMag.data[7] = document.getElementById("ville").value;

  console.log("== SAVE ==");
  console.log("INDEX :", currentMag.rowIndex);
  console.log("ROW :", currentMag.data);

  // Envoi API
  const res = await fetch(APPS_SCRIPT_URL + "?origin=" + ALLOWED_ORIGIN, {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      index: currentMag.rowIndex,
      row: currentMag.data
    })
  });

  const json = await res.json();

  if (!json.ok) {
    alert("Erreur API lors de la sauvegarde !");
    console.error(json);
    return;
  }

  alert("Magasin sauvegardé !");
  location.href = "dashboard.html";
}

/***********************************************************
 * AUTO-LANCEMENT
 ***********************************************************/
loadMagasin();
