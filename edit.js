/***********************************************************
 * CONFIG
 ***********************************************************/
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxamWQ5gx9ofSAwYMttyOjsju_XSdDgHdTBFtksLkXPH50WPmqp0AYHZAIq0o_KR4ZMyQ/exec";
const ALLOWED_ORIGIN = "https://rudychappron.github.io";

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

  // Charger toutes les lignes
  const res = await fetch(APPS_SCRIPT_URL + "?action=get&origin=" + ALLOWED_ORIGIN);
  const json = await res.json();

  if (!json.ok) {
    alert("Erreur API");
    return;
  }

  const rows = json.data.slice(1); // on enlève l'entête

  // Trouver la ligne
  const idx = rows.findIndex(r => r[0] == code);

  if (idx === -1) {
    alert("Magasin introuvable !");
    location.href = "dashboard.html";
    return;
  }

  // ⚡ ON STOCKE UN OBJET COMPATIBLE AVEC APP.JS
  currentMag = {
    rowIndex: idx,    // index réel dans Sheets (0-based)
    data: rows[idx]   // tableau complet de la ligne
  };

  // Pré-remplissage du formulaire
  document.getElementById("code").value = currentMag.data[0];
  document.getElementById("nom").value = currentMag.data[2] || "";
  document.getElementById("type").value = currentMag.data[3] || "";
  document.getElementById("adresse").value = currentMag.data[5] || "";
  document.getElementById("cp").value = currentMag.data[6] || "";
  document.getElementById("ville").value = currentMag.data[7] || "";
}

/***********************************************************
 * SAUVEGARDE
 ***********************************************************/
async function saveEdit() {

  if (!currentMag) {
    alert("Erreur interne : aucun magasin chargé !");
    return;
  }

  // Réécrire la ligne modifiée
  currentMag.data[0] = document.getElementById("code").value;
  currentMag.data[2] = document.getElementById("nom").value;
  currentMag.data[3] = document.getElementById("type").value;
  currentMag.data[5] = document.getElementById("adresse").value;
  currentMag.data[6] = document.getElementById("cp").value;
  currentMag.data[7] = document.getElementById("ville").value;

  console.log("== SAVE ==");
  console.log("INDEX :", currentMag.rowIndex);
  console.log("ROW :", currentMag.data);

  const res = await fetch(APPS_SCRIPT_URL + "?origin=" + ALLOWED_ORIGIN, {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      index: currentMag.rowIndex,   // ⭐ EXACTEMENT COMME toggleVisite
      row: currentMag.data
    })
  });

  const json = await res.json();

  if (!json.ok) {
    alert("Erreur API lors de la sauvegarde !");
    console.error(json);
    return;
  }

  alert("Magasin mis à jour !");
  location.href = "dashboard.html";
}

/***********************************************************
 * AUTO-LANCEMENT
 ***********************************************************/
loadMagasin();
