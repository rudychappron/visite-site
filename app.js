/***********************************************************
 * CONFIG
 ***********************************************************/
const SHEET = "Magasins";
const ALLOWED = "https://rudychappron.github.io";

/***********************************************************
 * OPTIONS (CORS)
 ***********************************************************/
function doOptions() {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      "Access-Control-Allow-Origin": ALLOWED,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
}

/***********************************************************
 * DOGET — compatibilité OPTIONS + GET normal
 ***********************************************************/
function doGet(e) {

  // OPTIONS fallback (important)
  if (e && e.parameter && e.parameter.options === "true") {
    return doOptions();
  }

  const origin = e?.parameter?.origin || "";
  if (origin !== ALLOWED) {
    return ContentService.createTextOutput("Forbidden");
  }

  // Lecture des données
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
  const data = sheet.getDataRange().getValues();

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      "Access-Control-Allow-Origin": ALLOWED
    });
}

/***********************************************************
 * DOPOST — Add / Update / Delete (FULL CORS)
 ***********************************************************/
function doPost(e) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  let result = {};

  // 🔵 Mise à jour
  if (action === "update") {
    sheet.getRange(body.index + 1, 1, 1, body.row.length).setValues([body.row]);
    result = { ok: true };
  }

  // 🔴 Suppression
  else if (action === "delete") {
    sheet.deleteRow(body.index + 1);
    result = { ok: true };
  }

  // 🟢 Ajout
  else if (action === "add") {
    sheet.appendRow(body.row);
    result = { ok: true };
  }

  // ❌ Action inconnue
  else {
    result = { ok: false, error: "Action inconnue" };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      "Access-Control-Allow-Origin": ALLOWED,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
}
