/***********************************************************
 * CONFIG
 ***********************************************************/
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzcUr84EJSS0ngVtLT2d5NFSIp24hCJNDgAShacHvClGUW8Kek4ZtXVlJGekIy2shSUIw/exec";

/***********************************************************
 * CHARGER LE MAGASIN À MODIFIER
 ***********************************************************/
async function loadMagasin() {
  const code = localStorage.getItem("editCode");
  if (!code) {
    alert("Aucun magasin sélectionné !");
    location.href = "dashboard.html";
    return;
  }

  // Charger toute la feuille
  const res = await fetch(APPS_SCRIPT_URL + "?action=get");
  const json = await res.json();

  if (!json.ok) {
    alert("Erreur API");
    return;
  }

  const rows = json.data;

  // Trouver la ligne du magasin
  const row = rows.find(r => r[0] == code);
  if (!row) {
    alert("Magasin introuvable !");
    location.href = "dashboard.html";
    return;
  }

  // Index dans la feuille
  window.editIndex = rows.indexOf(row);

  // Préremplir les champs
  document.getElementById("code").value = row[0];
  document.getElementById("nom").value = row[2] || "";
  document.getElementById("type").value = row[3] || "";
  document.getElementById("adresse").value = row[5] || "";
  document.getElementById("cp").value = row[6] || "";
  document.getElementById("ville").value = row[7] || "";
}

/***********************************************************
 * SAUVEGARDER LES MODIFICATIONS
 ***********************************************************/
async function saveEdit() {
  const row = [];

  row[0] = document.getElementById("code").value;
  row[1] = false; // Visité (ne change pas ici)
  row[2] = document.getElementById("nom").value;
  row[3] = document.getElementById("type").value;
  row[4] = ""; 
  row[5] = document.getElementById("adresse").value;
  row[6] = document.getElementById("cp").value;
  row[7] = document.getElementById("ville").value;

  // Colonnes restantes (si vides dans ton Sheets)
  row[8] = "";
  row[9] = "";
  row[10] = "";
  row[11] = "";
  row[12] = "";

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "update",
      index: window.editIndex,
      row
    })
  });

  alert("Magasin mis à jour !");
  location.href = "dashboard.html";
}

/***********************************************************
 * DECONNEXION
 ***********************************************************/
function logout() {
  localStorage.removeItem("session");
  location.href = "index.html";
}

/***********************************************************
 * AUTO-LANCEMENT
 ***********************************************************/
loadMagasin();
