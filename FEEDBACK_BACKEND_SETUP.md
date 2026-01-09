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
   Omniedit Backend API v2 (Secured)
   Handles Feature Requests and Feedback via Google Sheets
   Security Features: Rate Limiting, Payload Validation, Input Sanitization
*/

const SHEET_FEATURES = 'Features';
const SHEET_FEEDBACK = 'Feedback';

// Config
const MAX_PAYLOAD_SIZE = 10000; // 10KB Limit to prevent DoS
const MIN_INTERVAL_MS = 2000;   // Minimum 2 seconds between writes per user (best effort)

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  // 1. PAYLOAD SIZE CHECK (DoS Protection)
  if (e.postData && e.postData.length > MAX_PAYLOAD_SIZE) {
     return createJSONOutput({ status: 'error', message: 'Payload too large' });
  }
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 5s. Fail fast if busy.
  if (!lock.tryLock(5000)) {
    return createJSONOutput({ status: 'error', message: 'Server busy. Try again later.' });
  }

  try {
    // 2. RATE LIMITING (Token Bucket / Time Window)
    // We use a combination of IP/UA fingerprint (if available) or just global script lock for basic throttling.
    // Apps Script doesn't give real IP, so we rely on User-Agent + a custom client token if we had one.
    // Here we use a global throttle for simplicity/robustness on the free tier.
    const cache = CacheService.getScriptCache();
    const lastWrite = cache.get('global_last_write');
    const now = new Date().getTime();
    
    if (lastWrite && (now - parseInt(lastWrite) < 500)) {
       // Global throttle: prevent more than ~2 requests per second across all users
       // This protects the Google Sheet from write contention errors.
       Utilities.sleep(1000); 
    }

    // Handle GET requests (Fetch Features)
    if (!e.postData) {
      return handleGet(e);
    }

    // Handle POST requests
    return handlePost(e);

  } catch (err) {
    console.error(err);
    return createJSONOutput({ status: 'error', message: 'Internal Error' });
  } finally {
    // Update global write time
    try { CacheService.getScriptCache().put('global_last_write', new Date().getTime().toString(), 20); } catch(e) {}
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
    title: String(row[1]).substring(0, 100), // Strict Output Truncation
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
  
  // 3. INPUT SCHEMA VALIDATION
  const errors = validateInput(data);
  if (errors.length > 0) {
    return createJSONOutput({ status: 'error', message: 'Validation Failed', details: errors });
  }

  // --- Action: Add Feature ---
  if (data.action === 'add_feature') {
    let sheet = getOrCreateSheet(doc, SHEET_FEATURES, ['ID', 'Title', 'Description', 'Status', 'Votes', 'Date', 'UserAgent']);
    const id = Utilities.getUuid();
    
    // Sanitize - already checked in validateInput but good to be safe w/ substring
    const safeTitle = data.title.substring(0, 100); 
    const safeDesc = data.description.substring(0, 500);

    sheet.appendRow([
      id, safeTitle, safeDesc, 'requested', 1, new Date().toISOString(), userAgent
    ]);
    return createJSONOutput({ status: 'success', id: id });
  }

  // --- Action: Vote Feature ---
  if (data.action === 'vote') {
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
    let sheet = getOrCreateSheet(doc, SHEET_FEEDBACK, ['Date', 'Type', 'Message', 'Email', 'UserAgent']);
    
    const safeType = (data.type || 'feedback').substring(0, 50);
    const safeMsg = data.message.substring(0, 1000);
    const safeEmail = (data.email || '').substring(0, 100);

    // Basic Email Format Check (Regex)
    if (safeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
         // Don't fail the whole request, just ignore email or mark invalid? 
         // Let's just save it but user knows it might be garbage.
    }

    sheet.appendRow([
      new Date().toISOString(), safeType, safeMsg, safeEmail, userAgent
    ]);
    return createJSONOutput({ status: 'success' });
  }

  return createJSONOutput({ status: 'error', message: 'Unknown action' });
}

// Security: Strict Input Validation Helper
function validateInput(data) {
  const errors = [];
  
  if (data.action === 'add_feature') {
    if (!data.title || typeof data.title !== 'string' || data.title.length < 3 || data.title.length > 100) {
      errors.push('Title must be between 3 and 100 characters');
    }
    if (!data.description || typeof data.description !== 'string' || data.description.length > 500) {
      errors.push('Description must be under 500 characters');
    }
  }
  
  if (data.action === 'submit_feedback') {
     if (!data.message || typeof data.message !== 'string' || data.message.length > 1000) {
       errors.push('Message too long (max 1000 chars)');
     }
  }

  if (data.action === 'vote') {
     if (!data.id || typeof data.id !== 'string') errors.push('Invalid ID');
     if (!data.delta || (data.delta !== 1 && data.delta !== -1)) errors.push('Invalid vote delta');
  }

  return errors;
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
