const SHEET = "Magasins";
const ALLOWED = "https://rudychappron.github.io";

// ======================
// CORS OPTIONS
// ======================
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

// ======================
// GET = Lecture du tableau
// ======================
function doGet(e) {
  const origin = e?.parameter?.origin || "";
  if (origin !== ALLOWED) {
    return ContentService.createTextOutput("Forbidden");
  }

  const action = e?.parameter?.action || "get";

  if (action === "get") {
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const data = sheet.getDataRange().getValues();

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({ "Access-Control-Allow-Origin": ALLOWED });
  }
}

// ======================
// POST = Add / Update / Delete
// ======================
function doPost(e) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  if (action === "update") {
    sheet.getRange(body.index + 1, 1, 1, body.row.length).setValues([body.row]);

    return sendOK();
  }

  if (action === "delete") {
    sheet.deleteRow(body.index + 1);
    return sendOK();
  }

  if (action === "add") {
    sheet.appendRow(body.row);
    return sendOK();
  }

  return sendError("Action inconnue");
}

// ======================
// Helpers
// ======================
function sendOK() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({ "Access-Control-Allow-Origin": ALLOWED });
}

function sendError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({ "Access-Control-Allow-Origin": ALLOWED });
}
