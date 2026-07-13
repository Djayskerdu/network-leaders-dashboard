/**
 * TRCF CONSOLIDATION SYSTEM — backend
 * ------------------------------------
 * Paste this into the Apps Script editor of a NEW Google Sheet (this can
 * be a totally separate sheet from "NETWORK LEADERS CELL REPORTS" — it's
 * its own small database for First Timer / VIP records).
 *
 * After pasting:
 *   1. Run `setup` once from the function dropdown (creates the
 *      "FirstTimers" tab with the right headers). Authorize when asked.
 *   2. Deploy → New deployment → type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   3. Copy the Web App URL it gives you — you'll paste that into the
 *      Consolidation tab's config in the dashboard app.
 */

var SHEET_NAME = "FirstTimers";

var COLUMNS = [
  "ID","Name","ContactNumber","Address","Age","Gender","MaritalStatus",
  "DateVisited","InvitedBy","Decision","AssignedNetworkId","AssignedLeaderName",
  "FollowUpStatus","Notes","EncodedBy","DateEncoded"
];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold").setBackground("#1F2A44").setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { setup(); sheet = ss.getSheetByName(SHEET_NAME); }
  return sheet;
}

function doGet(e) {
  try {
    var sheet = getSheet_();
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var records = [];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (!row[0]) continue; // skip blank rows
      var rec = {};
      headers.forEach(function (h, j) { rec[h] = row[j]; });
      records.push(rec);
    }
    return jsonOut_({ success: true, data: { records: records } });
  } catch (err) {
    return jsonOut_({ success: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    if (action === "createRecord") return jsonOut_(createRecord_(body.record));
    if (action === "updateRecord") return jsonOut_(updateRecord_(body.id, body.record));
    if (action === "deleteRecord") return jsonOut_(deleteRecord_(body.id));
    return jsonOut_({ success: false, error: "Unknown action" });
  } catch (err) {
    return jsonOut_({ success: false, error: String(err) });
  }
}

function createRecord_(record) {
  var sheet = getSheet_();
  var id = String(Date.now());
  var row = COLUMNS.map(function (col) {
    if (col === "ID") return id;
    if (col === "DateEncoded") return new Date().toISOString();
    return record[col] !== undefined ? record[col] : "";
  });
  sheet.appendRow(row);
  return { success: true, id: id };
}

function updateRecord_(id, patch) {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idCol = headers.indexOf("ID");
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      headers.forEach(function (h, j) {
        if (patch[h] !== undefined) sheet.getRange(i + 1, j + 1).setValue(patch[h]);
      });
      return { success: true };
    }
  }
  return { success: false, error: "Record not found" };
}

function deleteRecord_(id) {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var idCol = values[0].indexOf("ID");
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: "Record not found" };
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
