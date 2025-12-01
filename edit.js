/***********************************************************
 * CONFIG
 ***********************************************************/
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw55iouMkIi2DH8yuKWzY2RGjjKL2Z9PvA0N1bakqVWyH6AeVshrL3kYLQZnVJLVLVOMw/exec";

/***********************************************************
 * CHARGER LES DONNÉES DU MAGASIN
 ***********************************************************/
async function loadMagasin() {

  const code = localStorage.getItem("editCode");

  if (!code) {
    alert("Aucun magasin sélectionné !");
    location.href = "dashboard.html";
    return;
  }

  // Charger toutes les lignes
  const res = await fetch(APPS_SCRIPT_URL + "?origin=https://rudychappron.github.io");
  const json = await res.json();

  if (!json.ok) {
    alert("Erreur API");
    return;
  }

  const rows = json.data;

  // Trouver la ligne
  const row = rows.find(r => r[0] == code);

  if (!row) {
    alert("Magasin introuvable !");
    location.href = "dashboard.html";
    return;
  }

  // Index réel dans Sheets
  window.editIndex = rows.indexOf(row);

  // Pré-remplissage du formulaire
  document.getElementById("code").value = row[0];
  document.getElementById("nom").value = row[2] || "";
  document.getElementById("type").value = row[3] || "";
  document.getElementById("adresse").value = row[5] || "";
  document.getElementById("cp").value = row[6] || "";
  document.getElementById("ville").value = row[7] || "";
}

/***********************************************************
 * SAUVEGARDE DES MODIFICATIONS
 ***********************************************************/
async function saveEdit() {

  const row = [];

  row[0] = document.getElementById("code").value;          // Code magasin
  row[1] = false;                                          // Visité (pas modifié ici)
  row[2] = document.getElementById("nom").value;
  row[3] = document.getElementById("type").value;
  row[4] = "";                                             // Nom complet (optionnel)
  row[5] = document.getElementById("adresse").value;
  row[6] = document.getElementById("cp").value;
  row[7] = document.getElementById("ville").value;

  // Colonnes fixes pour rester compatibles avec le tableau Sheets
  row[8]  = ""; // Département
  row[9]  = ""; // ID
  row[10] = ""; // Mot de passe
  row[11] = ""; // Latitude
  row[12] = ""; // Longitude

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      index: window.editIndex,
      row
    }),
  });

  const json = await res.json();
  if (!json.ok) {
    alert("Erreur API lors de la sauvegarde !");
    return;
  }

  alert("Magasin mis à jour !");
  location.href = "dashboard.html";
}

/***********************************************************
 * LOGOUT
 ***********************************************************/
function logout() {
  localStorage.removeItem("session");
  location.href = "index.html";
}

/***********************************************************
 * AUTO-LANCEMENT AU CHARGEMENT DE LA PAGE
 ***********************************************************/
loadMagasin();
