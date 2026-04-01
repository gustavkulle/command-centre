// ═══════════════════════════════════════════════════════════════
// GUS'S COMMAND CENTRE — Google Apps Script Webhook
// ═══════════════════════════════════════════════════════════════
// 
// SETUP INSTRUCTIONS (one-time, ~5 minutes):
//
// 1. Go to sheets.google.com → create a new sheet called "Command Centre Data"
// 2. Click Extensions → Apps Script
// 3. Delete all existing code and paste THIS entire file
// 4. Click Save (💾)
// 5. Click Deploy → New Deployment
// 6. Click the gear ⚙️ next to "Select type" → choose "Web app"
// 7. Set: Execute as → "Me", Who has access → "Anyone"
// 8. Click Deploy → Authorize → Allow
// 9. Copy the Web App URL — paste it into the dashboard when prompted
// 10. Done. Data will now flow automatically every day.
// ═══════════════════════════════════════════════════════════════

const SHEET_NAME = "Daily Log";
const HEADERS = [
  "Date",
  "Day",
  "Energy",
  "Mood Word",
  "Theme",
  // Rituals
  "Meditated",
  "Stretched",
  "Gratitude",
  "Intentions Set",
  "Workout",
  "Shower",
  "Email Swept",
  "WhatsApp Swept",
  "Tasks Reviewed",
  // Habits
  "Omega3 AM",
  "Multivitamin",
  "Finasteride",
  "Creatine",
  "Omega3 PM",
  "Bottles of Water",
  "Water (ml)",
  "No Solo Snacking",
  "Plants Watered",
  "Facial Done",
  // Scores
  "Rituals %",
  "Habits %",
  "Priorities %",
  "Overall %",
  // Priorities
  "Priority 1",
  "Priority 1 Done",
  "Priority 2",
  "Priority 2 Done",
  "Priority 3",
  "Priority 3 Done",
  "Success Criteria",
  // Workout
  "Workout Note",
  // Evening
  "Win 1",
  "Win 2",
  "Win 3",
  "Would Do Differently",
  "Tomorrow's Intention",
  "Emotional Check-in",
  // Streaks
  "Habit Streak",
  "Workout Streak",
  "Meditation Streak",
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get or create the Daily Log sheet
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // Add headers on first run
      sheet.appendRow(HEADERS);
      // Style the header row
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground("#1a1a2e");
      headerRange.setFontColor("#c8a96e");
      headerRange.setFontWeight("bold");
      headerRange.setFontFamily("Courier New");
      sheet.setFrozenRows(1);
    }
    
    // Check if a row for today already exists — update it if so
    const today = data.date;
    const allData = sheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === today) {
        existingRow = i + 1; // 1-indexed
        break;
      }
    }
    
    // Build the row
    const row = [
      data.date || "",
      data.day || "",
      data.energy || "",
      data.moodWord || "",
      data.theme || "",
      // Rituals
      data.checks?.meditate ? "✓" : "✗",
      data.checks?.stretch ? "✓" : "✗",
      data.checks?.gratitude ? "✓" : "✗",
      data.checks?.intentions ? "✓" : "✗",
      data.checks?.workout ? "✓" : "✗",
      data.checks?.shower ? "✓" : "✗",
      data.checks?.email ? "✓" : "✗",
      data.checks?.whatsapp ? "✓" : "✗",
      data.checks?.tasks ? "✓" : "✗",
      // Habits
      data.checks?.["supp-omega-am"] ? "✓" : "✗",
      data.checks?.["supp-multi"] ? "✓" : "✗",
      data.checks?.["supp-fin"] ? "✓" : "✗",
      data.checks?.["supp-creatine"] ? "✓" : "✗",
      data.checks?.["supp-omega-pm"] ? "✓" : "✗",
      data.bottles || 0,
      (data.bottles || 0) * 900,
      data.checks?.["no-snacking"] ? "✓" : "✗",
      data.checks?.plants ? "✓" : "✗",
      data.checks?.facial ? "✓" : "✗",
      // Scores
      data.scores?.rituals || "0%",
      data.scores?.habits || "0%",
      data.scores?.priorities || "0%",
      data.scores?.overall || "0%",
      // Priorities
      data.priorities?.p1?.text || "",
      data.priorities?.p1?.done ? "✓" : "✗",
      data.priorities?.p2?.text || "",
      data.priorities?.p2?.done ? "✓" : "✗",
      data.priorities?.p3?.text || "",
      data.priorities?.p3?.done ? "✓" : "✗",
      data.successCriteria || "",
      // Workout
      data.workoutNote || "",
      // Evening
      data.wins?.w1 || "",
      data.wins?.w2 || "",
      data.wins?.w3 || "",
      data.wouldDoDifferently || "",
      data.tomorrowIntention || "",
      data.emotionalCheckin || "",
      // Streaks
      data.streaks?.habits || 0,
      data.streaks?.workout || 0,
      data.streaks?.meditate || 0,
    ];
    
    if (existingRow > 0) {
      // Update existing row for today
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      // Append new row
      sheet.appendRow(row);
      // Alternate row colours for readability
      const lastRow = sheet.getLastRow();
      const rowRange = sheet.getRange(lastRow, 1, 1, HEADERS.length);
      if (lastRow % 2 === 0) {
        rowRange.setBackground("#111111");
      } else {
        rowRange.setBackground("#0d0d0d");
      }
    }
    
    // Auto-size columns on first few runs
    if (allData.length < 5) {
      sheet.autoResizeColumns(1, HEADERS.length);
    }
    
    // Update the Summary sheet
    updateSummarySheet(ss, sheet);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: "Data saved to sheet", date: today }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Health check endpoint — used by dashboard to verify connection
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Gus Command Centre webhook is live" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateSummarySheet(ss, dataSheet) {
  // Get or create Summary sheet
  let summary = ss.getSheetByName("Summary");
  if (!summary) {
    summary = ss.insertSheet("Summary");
  }
  summary.clearContents();
  
  const data = dataSheet.getDataRange().getValues();
  if (data.length < 2) return;
  
  // Last 7 days of data (skip header row)
  const rows = data.slice(1).reverse().slice(0, 7);
  
  summary.getRange("A1").setValue("📊 COMMAND CENTRE — WEEKLY SUMMARY");
  summary.getRange("A1").setFontSize(14).setFontWeight("bold").setFontColor("#c8a96e");
  
  summary.getRange("A3").setValue("Last 7 Days:");
  summary.getRange("A3").setFontWeight("bold");
  
  // Headers for summary
  const summaryHeaders = ["Date", "Energy", "Overall%", "Workout", "Meditate", "Water(ml)", "Streak"];
  summary.getRange(4, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  summary.getRange(4, 1, 1, summaryHeaders.length).setFontWeight("bold");
  
  rows.forEach((row, i) => {
    summary.getRange(5 + i, 1).setValue(row[0]); // Date
    summary.getRange(5 + i, 2).setValue(row[2]); // Energy
    summary.getRange(5 + i, 3).setValue(row[26]); // Overall %
    summary.getRange(5 + i, 4).setValue(row[9]);  // Workout
    summary.getRange(5 + i, 5).setValue(row[5]);  // Meditate
    summary.getRange(5 + i, 6).setValue(row[21]); // Water ml
    summary.getRange(5 + i, 7).setValue(row[41]); // Habit streak
  });
  
  summary.autoResizeColumns(1, 7);
}
