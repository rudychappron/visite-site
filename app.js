// ==============================
// CONFIG API
// ==============================
const API_URL = "https://script.google.com/macros/s/AKfycbyTaON-rMsTOV1tGAVpcaVfHWK9w7HzZjai7QXVvhSoADQ8V1AxStnVWG-2m1Jaqch1Pw/exec";

let magasins = [];


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
// AFFICHAGE TABLEAU
// ==============================
function render(list) {
    const tbody = document.querySelector("tbody");
    tbody.innerHTML = "";

    list.slice(1).forEach(row => {
        const [code, nom, type, adresse, cp, ville] = row;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${code}</td>
          <td>${nom}</td>
          <td>${type}</td>
          <td>${adresse}</td>
          <td>${ville}</td>
          <td>${cp}</td>
          <td>
             <button onclick="edit('${code}')">✏</button>
             <button onclick="del('${code}')">🗑</button>
             <button onclick="waze('${adresse} ${cp} ${ville}')">🚗</button>
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
    render(magasins.filter(r => r.join(" ").toLowerCase().includes(v)));
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
function edit(code){
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
    load(); // recharge la liste
}


// ==============================
// WAZE
// ==============================
function waze(adresse){
    const url = "https://waze.com/ul?q=" + encodeURIComponent(adresse);
    location.href = url;
}


// ==============================
// VIDE CACHE PWA
// ==============================
function clearCache(){
    if ('caches' in window){
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
        alert("Cache vidé !");
    }
}


// ==============================
// AUTO-LOAD SELON LA PAGE
// ==============================
if (location.href.includes("dashboard")) load();
if (location.href.includes("edit-magasin")) fillEdit();
