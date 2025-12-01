/***********************************************************
 * CONFIG
 ***********************************************************/
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxamWQ5gx9ofSAwYMttyOjsju_XSdDgHdTBFtksLkXPH50WPmqp0AYHZAIq0o_KR4ZMyQ/exec";

/***********************************************************
 * CHARGER LE MAGASIN
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

  // INDEX GLOBAL (dans le tableau complet)
  window.editIndex = rows.indexOf(row);

  // Pré-remplir le formulaire
  document.getElementById("code").value = row[0];
  document.getElementById("nom").value = row[2] || "";
  document.getElementById("type").value = row[3] || "";
  document.getElementById("adresse").value = row[5] || "";
  document.getElementById("cp").value = row[6] || "";
  document.getElementById("ville").value = row[7] || "";
}

/***********************************************************
 * SAUVEGARDE
 ***********************************************************/
async function saveEdit() {

  const row = [];

  row[0] = document.getElementById("code").value;
  row[1] = false; // Visité
  row[2] = document.getElementById("nom").value;      // NOM COMPLET
  row[3] = document.getElementById("type").value;     // TYPE
  row[4] = "";                                        // NOM (court)
  row[5] = document.getElementById("adresse").value;
  row[6] = document.getElementById("cp").value;
  row[7] = document.getElementById("ville").value;

  // Colonnes fixes
  row[8]  = "";
  row[9]  = "";
  row[10] = "";
  row[11] = "";
  row[12] = "";
  row[13] = "";
  row[14] = "";

  const body = {
    action: "update",
    index: window.editIndex,
    row: row,
    origin: "https://rudychappron.github.io"
  };

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(body)
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
 * AUTO
 ***********************************************************/
loadMagasin();
