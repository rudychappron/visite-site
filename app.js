/***********************************************************
 * CONFIG
 ***********************************************************/
const SHEET = "Magasins";
const ALLOWED = "https://rudychappron.github.io";

/***********************************************************
 * GET — LECTURE DES DONNÉES
 ***********************************************************/
function doGet(e) {

  const origin = e?.parameter?.origin || "";
  if (origin !== ALLOWED) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "Origin not allowed" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.openById("11cswsfE5PVqNQoP-lS44PItpI_GeV6WHfoo5x8McC_g");
  const sh = ss.getSheetByName(SHEET);
  const data = sh.getDataRange().getValues();

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, data })
  ).setMimeType(ContentService.MimeType.JSON);
}

/***********************************************************
 * POST — AJOUT / UPDATE / DELETE
 ***********************************************************/
function doPost(e) {

  const origin = e?.parameter?.origin || "";
  if (origin !== ALLOWED) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "Origin not allowed" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const body = JSON.parse(e.postData.contents || "{}");

  const ss = SpreadsheetApp.openById("11cswsfE5PVqNQoP-lS44PItpI_GeV6WHfoo5x8McC_g");
  const sh = ss.getSheetByName(SHEET);

  /********************
   * AJOUT
   ********************/
  if (body.action === "add") {
    sh.appendRow(body.row);
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  /********************
   * UPDATE
   ********************/
  if (body.action === "update") {
    const index = Number(body.index);
    if (index < 1) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "Index incorrect" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    sh.getRange(index + 1, 1, 1, body.row.length).setValues([body.row]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  /********************
   * DELETE
   ********************/
  if (body.action === "delete") {
    const index = Number(body.index);
    sh.deleteRow(index + 1);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ ok: false, error: "Action inconnue" })
  ).setMimeType(ContentService.MimeType.JSON);
}
