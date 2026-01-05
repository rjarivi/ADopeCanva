# Backend Setup Guide: Google Sheets & Apps Script

To enable a real backend for Feedback and Feature Requests, follow these steps:

## 1. Create a Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it "Omniedit Backend" (or anything you prefer).
3. The script below will automatically create the necessary tabs ("Features" and "Feedback") when data is submitted, so you don't need to rename the default sheet manually.

## 2. Open Apps Script
1. In your Google Sheet, click **Extensions** > **Apps Script**.
2. Rename the project to "Omniedit API".
3. Delete any code in `Code.gs`.
4. **IMPORTANT**: Copy the code below, but **exclude** the lines with ` ```javascript ` and ` ``` `. Start copying from `const SHEET_FEATURES...`.

```javascript
/*
   Omniedit Backend API
   Handles Feature Requests and Feedback via Google Sheets
*/

const SHEET_FEATURES = 'Features';
const SHEET_FEEDBACK = 'Feedback';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

const MAX_LENGTH = 2000; // Max characters per message

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 10s. If busy, reject (Simple rate limiting/throttling)
  if (!lock.tryLock(10000)) {
    return createJSONOutput({ status: 'error', message: 'Server busy. Try again later.' });
  }

  try {
    // 1. RATE LIMITING (Basic)
    // Check if we've written recently (protects writes/quota)
    const cache = CacheService.getScriptCache();
    const lastWrite = cache.get('last_write');
    // If a write happened < 500ms ago, simple throttle (Google limits ~30 sims calls)
    if (lastWrite && new Date().getTime() - parseInt(lastWrite) < 500) {
       // Just sleep a bit to smooth out bursts
       Utilities.sleep(1000); 
    }

    // Handle GET requests (Fetch Features)
    if (!e.postData) {
      return handleGet(e);
    }

    // Handle POST requests
    return handlePost(e);

  } catch (err) {
    return createJSONOutput({ status: 'error', message: 'Internal Error' });
  } finally {
    // Update last write time
    try { CacheService.getScriptCache().put('last_write', new Date().getTime().toString(), 10); } catch(e) {}
    lock.releaseLock();
  }
}

function handleGet(e) {
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = doc.getSheetByName(SHEET_FEATURES);
  if (!sheet) return createJSONOutput([]);

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return createJSONOutput([]); 

  // Read only safely formatted data
  const features = data.slice(1).map(row => ({
    id: String(row[0]),
    title: String(row[1]).substring(0, 100), // Truncate for safety
    description: String(row[2]).substring(0, 500),
    status: row[3],
    votes: parseInt(row[4] || 0),
    date: row[5]
  }));
  
  return createJSONOutput(features);
}

function handlePost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (e) {
    return createJSONOutput({ status: 'error', message: 'Invalid JSON' });
  }

  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const userAgent = (data.userAgent || 'Unknown').substring(0, 200);

  // --- Validate Common Fields ---
  if (!data.action) return createJSONOutput({ status: 'error', message: 'Missing action' });

  // --- Action: Add Feature ---
  if (data.action === 'add_feature') {
    // Validation
    if (!data.title || !data.description) return createJSONOutput({ status: 'error', message: 'Missing fields' });
    if (data.title.length > 200) return createJSONOutput({ status: 'error', message: 'Title too long' });
    
    let sheet = getOrCreateSheet(doc, SHEET_FEATURES, ['ID', 'Title', 'Description', 'Status', 'Votes', 'Date', 'UserAgent']);
    const id = Utilities.getUuid();
    
    // Sanitize
    const safeTitle = data.title.substring(0, 200);
    const safeDesc = data.description.substring(0, MAX_LENGTH);

    sheet.appendRow([
      id, safeTitle, safeDesc, 'requested', 1, new Date().toISOString(), userAgent
    ]);
    return createJSONOutput({ status: 'success', id: id });
  }

  // --- Action: Vote Feature ---
  if (data.action === 'vote') {
    if (!data.id) return createJSONOutput({ status: 'error', message: 'Missing ID' });
    
    const sheet = doc.getSheetByName(SHEET_FEATURES);
    if (!sheet) return createJSONOutput({ status: 'error', message: 'Sheet not found' });
    
    const rows = sheet.getDataRange().getValues();
    const id = data.id;
    // Limit delta to exactly 1 or -1 to prevent massive vote hacking
    const delta = data.delta === 1 ? 1 : -1; 
    
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] == id) {
          const currentVotes = parseInt(rows[i][4] || 0);
          sheet.getRange(i + 1, 5).setValue(currentVotes + delta);
          return createJSONOutput({ status: 'success' });
        }
    }
    return createJSONOutput({ status: 'error', message: 'Feature not found' });
  }

  // --- Action: Submit Feedback ---
  if (data.action === 'submit_feedback') {
    if (!data.message) return createJSONOutput({ status: 'error', message: 'Missing message' });
    
    let sheet = getOrCreateSheet(doc, SHEET_FEEDBACK, ['Date', 'Type', 'Message', 'Email', 'UserAgent']);
    
    const safeType = (data.type || 'feedback').substring(0, 50);
    const safeMsg = data.message.substring(0, MAX_LENGTH);
    const safeEmail = (data.email || '').substring(0, 200);

    sheet.appendRow([
      new Date().toISOString(), safeType, safeMsg, safeEmail, userAgent
    ]);
    return createJSONOutput({ status: 'success' });
  }

  return createJSONOutput({ status: 'error', message: 'Unknown action' });
}

function getOrCreateSheet(doc, name, headers) {
  let sheet = doc.getSheetByName(name);
  if (!sheet) {
    sheet = doc.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy as Web App
1. Click the blue **Deploy** button > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. **Description**: "Omniedit API v1"
4. **Execute as**: "Me" (your email)
5. **Who has access**: **"Anyone"** (This is critical so your frontend can access it without logging into Google).
6. Click **Deploy**.
7. Copy the **Web App URL** (it starts with `https://script.google.com/macros/s/...`).

## 4. Connect to Frontend
1. Open your project locally.
2. Setup the environment variable (or hardcode it if you prefer for a quick test).
3. The app is already configured to look for `VITE_FEEDBACK_API_URL`.
   
   If you rely on `.env.local`, add this line:
   ```
   VITE_FEEDBACK_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
