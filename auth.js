// HASH SHA-256 du mot de passe Chappron1992
const HASH = "91f9d5e7e7730f83b8a7a830180ba893bb8e2ad067361e5b1862f08e5ad96507";

function sha256(str) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
    .then(buf => Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0")).join(""));
}

async function login() {
  const u = user.value.trim();
  const p = pass.value.trim();
  const h = await sha256(p);

  if (u === "rudy" && h === HASH) {
    localStorage.setItem("session", "ok");
    location.href = "dashboard.html";
  } else {
    login-error.innerText = "❌ Identifiants incorrects";
  }
}

function logout() {
  localStorage.removeItem("session");
  location.href = "index.html";
}

if (!location.href.includes("index.html") && localStorage.getItem("session") !== "ok") {
  location.href = "index.html";
}
