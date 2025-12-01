/****************************************************
 * CONFIG
 ****************************************************/
const ALLOWED_ORIGIN = "https://rudychappron.github.io";
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwSHdLecIBM3RcVFyzQpm8Xrj2aKiyK-seP6upTjY0Wf-CWklBDdBr9x5DlbVx4znafGQ/exec";

/****************************************************
 * AJOUTER UN MAGASIN
 ****************************************************/
async function addMagasin() {

  const code = document.getElementById("code").value.trim();
  const nom = document.getElementById("nom").value.trim();
  const type = document.getElementById("type").value.trim();
  const adresse = document.getElementById("adresse").value.trim();
  const cp = document.getElementById("cp").value.trim();
  const ville = document.getElementById("ville").value.trim();

  if (!code || !nom || !type) {
    alert("⚠️ Code, nom et type sont obligatoires.");
    return;
  }

  const body = {
    code,
    fait: false,
    nom_complet: nom,
    type,
    nom: "",
    adresse,
    cp,
    ville,
    dep: "",
    id: "",
    mp: "",
    lat: "",
    lng: "",
    km: "",
    temps: "",
    origin: ALLOWED_ORIGIN
  };

  try {

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(body)
    });

    const json = await res.json();

    if (json.ok) {
      alert("Magasin ajouté !");
      location.href = "dashboard.html";
    } else {
      alert("Erreur API : " + (json.error || "inconnue"));
    }

  } catch (e) {
    console.error(e);
    alert("Erreur réseau : impossible d’ajouter le magasin.");
  }
}
