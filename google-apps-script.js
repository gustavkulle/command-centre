// ═══════════════════════════════════════════════════════════════
// GUS'S COMMAND CENTRE — Google Apps Script Webhook v2
// With proper CORS headers for GitHub Pages
// ═══════════════════════════════════════════════════════════════
//
// SETUP INSTRUCTIONS (one-time, ~5 minutes):
// 1. Go to your "Command Centre Data" Google Sheet
// 2. Click Extensions → Apps Script
// 3. DELETE all existing code and paste THIS entire file
// 4. Click Save (💾)
// 5. Click Deploy → New Deployment (or manage existing → create new version)
// 6. Type: Web app | Execute as: Me | Who has access: Anyone
// 7. Click Deploy → Authorize → Allow
// 8. Copy the NEW Web App URL and paste into dashboard Settings tab
// ═══════════════════════════════════════════════════════════════

const SHEET_NAME = "Daily Log";

const HEADERS = [
  "Date", "Day", "Energy", "Mood Word", "Theme",
  "Meditated", "Stretched", "Gratitude", "Intentions Set",
  "Workout", "Shower", "Email Swept", "WhatsApp Swept", "Tasks Reviewed",
  "Omega3 AM", "Multivitamin", "Finasteride", "Creatine", "Omega3 PM",
  "Bottles", "Water (ml)", "No Solo Snacking", "Plants Watered", "Facial Done",
  "Rituals %", "Habits %", "Priorities %", "Overall %",
  "Priority 1", "P1 Done", "Priority 2", "P2 Done", "Priority 3", "P3 Done",
  "Success Criteria", "Workout Note",
  "Win 1", "Win 2", "Win 3",
  "Would Do Differently", "Tomorrow's Intention", "Emotional Check-in",
  "Habit Streak", "Workout Streak", "Meditation Streak", "Timestamp"
];

// ── CORS helper — must be returned on ALL responses ──
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function makeResponse(obj, code) {
  const output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── Handle OPTIONS preflight ──
function doOptions(e) {
  return makeResponse({ status: "ok" });
}

// ── GET — health check ──
function doGet(e) {
  return makeResponse({
    status: "ok",
    message: "Gus Command Centre webhook is live",
    version: "2.0"
  });
}

// ── POST — receive daily data ──
function doPost(e) {
  try {
    const raw = e.postData ? e.postData.contents : "{}";
    const data = JSON.parse(raw);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet with headers if first run
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      const hRange = sheet.getRange(1, 1, 1, HEADERS.length);
      hRange.setValues([HEADERS]);
      hRange.setBackground("#1a1a2e");
      hRange.setFontColor("#c8a96e");
      hRange.setFontWeight("bold");
      hRange.setFontFamily("Courier New");
      hRange.setFrozenRows(1);
      sheet.setFrozenRows(1);
    }

    const today = data.date || new Date().toISOString().split("T")[0];

    // Check if row for today already exists
    const allData = sheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][0]) === today) {
        existingRow = i + 1;
        break;
      }
    }

    const c = data.checks || {};
    const p = data.priorities || {};
    const w = data.wins || {};
    const s = data.scores || {};
    const str = data.streaks || {};

    const row = [
      today,
      data.day || "",
      data.energy || "",
      data.moodWord || "",
      data.theme || "",
      c.meditate ? "✓" : "✗",
      c.stretch ? "✓" : "✗",
      c.gratitude ? "✓" : "✗",
      c.intentions ? "✓" : "✗",
      c.workout ? "✓" : "✗",
      c.shower ? "✓" : "✗",
      c.email ? "✓" : "✗",
      c.whatsapp ? "✓" : "✗",
      c["tasks-check"] ? "✓" : "✗",
      c["supp-omega-am"] ? "✓" : "✗",
      c["supp-multi"] ? "✓" : "✗",
      c["supp-fin"] ? "✓" : "✗",
      c["supp-creatine"] ? "✓" : "✗",
      c["supp-omega-pm"] ? "✓" : "✗",
      data.bottles || 0,
      (data.bottles || 0) * 900,
      c["no-snacking"] ? "✓" : "✗",
      c.plants ? "✓" : "✗",
      c.facial ? "✓" : "✗",
      s.rituals || "0%",
      s.habits || "0%",
      s.priorities || "0%",
      s.overall || "0%",
      p.p1 ? p.p1.text || "" : "",
      p.p1 && p.p1.done ? "✓" : "✗",
      p.p2 ? p.p2.text || "" : "",
      p.p2 && p.p2.done ? "✓" : "✗",
      p.p3 ? p.p3.text || "" : "",
      p.p3 && p.p3.done ? "✓" : "✗",
      data.successCriteria || "",
      data.workoutNote || "",
      w.w1 || "",
      w.w2 || "",
      w.w3 || "",
      data.wouldDoDifferently || "",
      data.tomorrowIntention || "",
      data.emotionalCheckin || "",
      str.habits || 0,
      str.workout || 0,
      str.meditate || 0,
      new Date().toISOString()
    ];

    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
      // Zebra stripe
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1, 1, HEADERS.length)
        .setBackground(lastRow % 2 === 0 ? "#111111" : "#0d0d0d");
    }

    // Auto-resize columns occasionally
    if (allData.length < 10) {
      sheet.autoResizeColumns(1, HEADERS.length);
    }

    // Update summary tab
    updateSummary(ss, sheet);

    return makeResponse({ success: true, date: today, message: "Row saved successfully" });

  } catch (err) {
    return makeResponse({ success: false, error: err.toString() });
  }
}

function updateSummary(ss, dataSheet) {
  let summary = ss.getSheetByName("Summary");
  if (!summary) summary = ss.insertSheet("Summary");
  summary.clearContents();

  const data = dataSheet.getDataRange().getValues();
  if (data.length < 2) return;

  const rows = data.slice(1).reverse().slice(0, 7);

  summary.getRange("A1").setValue("📊 COMMAND CENTRE — WEEKLY SUMMARY");
  summary.getRange("A1").setFontSize(13).setFontWeight("bold").setFontColor("#c8a96e");
  summary.getRange("A3").setValue("Last 7 days at a glance:").setFontWeight("bold");

  const summaryHeaders = ["Date", "Day", "Energy", "Overall %", "Workout", "Meditate", "Water ml", "Habit Streak"];
  summary.getRange(4, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  summary.getRange(4, 1, 1, summaryHeaders.length).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#c8a96e");

  rows.forEach((row, i) => {
    summary.getRange(5 + i, 1).setValue(row[0]);   // Date
    summary.getRange(5 + i, 2).setValue(row[1]);   // Day
    summary.getRange(5 + i, 3).setValue(row[2]);   // Energy
    summary.getRange(5 + i, 4).setValue(row[27]);  // Overall %
    summary.getRange(5 + i, 5).setValue(row[9]);   // Workout
    summary.getRange(5 + i, 6).setValue(row[5]);   // Meditate
    summary.getRange(5 + i, 7).setValue(row[20]);  // Water ml
    summary.getRange(5 + i, 8).setValue(row[42]);  // Habit streak
  });

  summary.autoResizeColumns(1, summaryHeaders.length);
}
