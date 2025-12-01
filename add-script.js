/***********************************************************
 * CONFIG
 ***********************************************************/
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxamWQ5gx9ofSAwYMttyOjsju_XSdDgHdTBFtksLkXPH50WPmqp0AYHZAIq0o_KR4ZMyQ/exec";

const ALLOWED_ORIGIN = "https://rudychappron.github.io";
const HERE_API_KEY = "5TuJy6GHPhdQDvXGdFa8Hq984DX0NsSGvl3dRZjx0uo";

/***********************************************************
 * GEOCODAGE HERE – (Adresse -> lat/lng)
 ***********************************************************/
async function geocodeAdresse(adresseComplete) {
  const url =
    `https://geocode.search.hereapi.com/v1/geocode` +
    `?q=${encodeURIComponent(adresseComplete)}` +
    `&apikey=${HERE_API_KEY}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!json.items || json.items.length === 0) return null;

  return {
    lat: json.items[0].position.lat,
    lng: json.items[0].position.lng
  };
}

/***********************************************************
 * AJOUTER UN MAGASIN – AVEC GEOLOCALISATION
 ***********************************************************/
async function addMagasin() {

  const code = document.getElementById("code").value.trim();
  const nom = document.getElementById("nom").value.trim();
  const type = document.getElementById("type").value.trim();
  const adresse = document.getElementById("adresse").value.trim();
  const cp = document.getElementById("cp").value.trim();
  const ville = document.getElementById("ville").value.trim();

  if (!code || !nom || !type || !adresse || !cp || !ville) {
    alert("Veuillez remplir tous les champs !");
    return;
  }

  // Construire l’adresse complète pour géocodage
  const fullAdresse = `${adresse} ${cp} ${ville}`;

  // === Géocodage automatique HERE ===
  const gps = await geocodeAdresse(fullAdresse);

  let lat = "";
  let lng = "";

  if (gps) {
    lat = gps.lat;
    lng = gps.lng;
  }

  console.log("=== AJOUT MAGASIN ===");
  console.log("Adresse complète :", fullAdresse);
  console.log("GPS :", lat, lng);

  // ENVOI À GOOGLE SHEETS
  const res = await fetch(APPS_SCRIPT_URL + "?origin=" + ALLOWED_ORIGIN, {
    method: "POST",
    body: JSON.stringify({
      action: "add",
      code,
      fait: false,
      nom_complet: nom,
      type,
      nom,
      adresse,
      cp,
      ville,
      dep: "",
      id: "",
      mp: "",
      lat,
      lng,
      km: "",
      temps: ""
    })
  });

  const json = await res.json();

  if (!json.ok) {
    alert("Erreur API lors de l’ajout !");
    console.error(json);
    return;
  }

  alert("Magasin ajouté avec succès !");
  location.href = "dashboard.html";
}

/***********************************************************
 * DECONNEXION
 ***********************************************************/
function logout() {
  localStorage.removeItem("session");
  location.href = "index.html";
}
