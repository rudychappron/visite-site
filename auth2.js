// HASH SHA-256 
const HASH = "6a93bf749c53a7c596f0cadb450e2ba4c92fbdc4ba3691e31839db9485cdb481";

// Fonction hash
async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );

  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Connexion
async function login() {
  const u = document.getElementById("user").value.trim();
  const p = document.getElementById("pass").value.trim();

  const h = await sha256(p);

  if (u === "rudy" && h === HASH) {
    localStorage.setItem("session", "ok");
    location.href = "dashboard.html";
  } else {
    document.getElementById("login-error").innerText = "❌ Identifiants incorrects";
  }
}

// Déconnexion
function logout() {
  localStorage.removeItem("session");
  location.href = "index.html";
}

// Vérification auto
if (!location.href.includes("index.html")) {
  if (localStorage.getItem("session") !== "ok") {
    location.href = "index.html";
  }
}
