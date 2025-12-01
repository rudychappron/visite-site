/****************************************************
 * HASH SHA-256
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
  const errorBox = document.getElementById("login-error");

  if (!u || !p) {
    errorBox.textContent = "⚠️ Veuillez entrer identifiant + mot de passe.";
    return;
  }

  const h = await sha256(p);

  if (u === "rudy" && h === HASH) {
    localStorage.setItem("session", "ok");
    location.href = "dashboard.html";
  } else {
    errorBox.textContent = "❌ Identifiants incorrects";
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
 * PROTECTION DES PAGES
 ****************************************************/
if (!location.pathname.endsWith("index.html") &&
    localStorage.getItem("session") !== "ok") {
  location.href = "index.html";
}
