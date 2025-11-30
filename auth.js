/****************************************************
 * HASH SHA-256 DU MOT DE PASSE (Chappron1992)
 ****************************************************/
const HASH = "2a6cdd3069d05b464c42d7762a72b88c7f7e39a32256bec00afc6ec42487c1ea";

/****************************************************
 * FONCTION HASH
 ****************************************************/
async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );

  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/****************************************************
 * CONNEXION
 ****************************************************/
async function login() {
  const u = document.getElementById("user").value.trim();
  const p = document.getElementById("pass").value.trim();

  if (!u || !p) {
    document.getElementById("login-error").innerText =
      "⚠️ Veuillez entrer identifiant + mot de passe.";
    return;
  }

  const h = await sha256(p);

  if (u === "rudy" && h === HASH) {
    localStorage.setItem("session", "ok");
    location.href = "dashboard.html";
  } else {
    document.getElementById("login-error").innerText =
      "❌ Identifiants incorrects";
  }
}

/****************************************************
 * DÉCONNEXION
 ****************************************************/
function logout() {
  localStorage.removeItem("session");
  location.href = "index.html";
}

/****************************************************
 * PROTECTION AUTOMATIQUE DES PAGES
 ****************************************************/
if (!location.href.includes("index.html")) {
  if (localStorage.getItem("session") !== "ok") {
    location.href = "index.html";
  }
}
