---
name: google-drive
description: Download files or list folder contents from a Google Drive share link. Handles both public ("anyone with the link") and authenticated access. When authentication is required, prompts the user for their OAuth token before retrying — no credentials are ever hardcoded or assumed.
version: 1.0.0
author: light-church
tags: [google-drive, files, download, integration]
---

# Google Drive

Use this skill whenever asked to pull, download, fetch, or import files from a Google Drive link. It covers both public share links and private links that require the user's Google account.

---

## Step 1 — Parse the link

Extract the ID and link type from the URL the user provides.

| Link pattern | Type | ID location |
|---|---|---|
| `drive.google.com/file/d/{ID}/view` | file | between `/d/` and `/view` |
| `drive.google.com/drive/folders/{ID}` | folder | after `/folders/` |
| `docs.google.com/document/d/{ID}/` | Google Doc | between `/d/` and the next `/` |
| `docs.google.com/spreadsheets/d/{ID}/` | Google Sheet | between `/d/` and the next `/` |
| `docs.google.com/presentation/d/{ID}/` | Google Slides | between `/d/` and the next `/` |
| `drive.google.com/open?id={ID}` | file | value of `id=` param |

If the user pastes the link, extract the ID yourself. If the link is malformed or the ID cannot be found, ask the user to paste the original share link again.

---

## Step 2 — Attempt public download (no auth)

Try the public download URL first — this works for any file shared as "anyone with the link".

**For regular files (non-Google-native):**
```
web.fetch("https://drive.google.com/uc?export=download&id={ID}&confirm=t")
```

**For Google Docs (export as PDF):**
```
web.fetch("https://docs.google.com/document/d/{ID}/export?format=pdf")
```

**For Google Sheets (export as CSV):**
```
web.fetch("https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid=0")
```

**For Google Slides (export as PDF):**
```
web.fetch("https://docs.google.com/presentation/d/{ID}/export/pdf")
```

**For folders** — list contents using the Drive API without auth first:
```
web.fetch("https://www.googleapis.com/drive/v3/files?q='{ID}'+in+parents&fields=files(id,name,mimeType,size)&key={API_KEY}")
```
Note: folder listing always needs either an API key or OAuth token — skip to Step 3 if the user gives a folder link.

### Detect whether auth is needed

The download succeeded (public) if:
- HTTP status is 200 and the response body is file content or JSON

Auth IS required if any of these appear in the response:
- HTTP 401 or 403
- A redirect to `accounts.google.com`
- HTML body containing `"ServiceLogin"` or `"Sign in"` or `"accounts.google.com/v3/signin"`
- JSON error with `"code": 401` or `"code": 403`

If public download succeeds → go to **Step 4 (save)**.
If auth is required → go to **Step 3**.

---

## Step 3 — Auth required: prompt the user (HITL gate)

Stop and tell the user plainly. Use this exact structure:

---
**This file requires Google authentication.**

The link `{original link}` is restricted to specific Google accounts. I need a temporary OAuth access token for your Google account to continue.

**Quickest way to get one (2 minutes):**
1. Open this URL in your browser: `https://developers.google.com/oauthplayground/`
2. In the left panel, find and select **Drive API v3** → tick `https://www.googleapis.com/auth/drive.readonly`
3. Click **Authorize APIs** → sign in with the Google account the file was shared with
4. Click **Exchange authorization code for tokens**
5. Copy the **Access token** value (starts with `ya29.`)

Paste the token here and I will continue the download.

---

Wait for the user to paste the token. Do not proceed until you have it. Do not ask for their Google password — only the OAuth token.

Once you have the token, store it as `GDRIVE_TOKEN` in session memory for reuse within this conversation.

---

## Step 4 — Authenticated download

Use the token the user provided for all Drive API calls.

**Download a file by ID:**
```
web.fetch(
  "https://www.googleapis.com/drive/v3/files/{ID}?alt=media",
  headers={ "Authorization": "Bearer {GDRIVE_TOKEN}" }
)
```

**Get file metadata (name, type, size) before downloading:**
```
web.fetch(
  "https://www.googleapis.com/drive/v3/files/{ID}?fields=name,mimeType,size,modifiedTime",
  headers={ "Authorization": "Bearer {GDRIVE_TOKEN}" }
)
```

**List all files in a folder:**
```
web.fetch(
  "https://www.googleapis.com/drive/v3/files?q='{FOLDER_ID}'+in+parents&fields=files(id,name,mimeType,size)&pageSize=50",
  headers={ "Authorization": "Bearer {GDRIVE_TOKEN}" }
)
```

**Export a Google-native file (Docs/Sheets/Slides):**
```
web.fetch(
  "https://www.googleapis.com/drive/v3/files/{ID}/export?mimeType=application/pdf",
  headers={ "Authorization": "Bearer {GDRIVE_TOKEN}" }
)
```
Common export MIME types:
- Google Doc → `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Google Sheet → `text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Google Slides → `application/pdf`

---

## Step 5 — Folder workflow

If the link is a folder, list its contents first and present a numbered menu to the user:

```
Files in this folder:
1. report-2026.pdf        (PDF, 2.3 MB)
2. data-export.csv        (CSV, 180 KB)
3. presentation.pptx      (PowerPoint, 4.1 MB)
4. All files

Which would you like to download? (type a number or "4" for all)
```

Wait for the user's selection, then download only the chosen files. For "all", download sequentially and report each as it completes.

---

## Step 6 — Save to workspace

After a successful download, write the file to the workspace:

```
write_file("/workspace/downloads/{filename}", content)
```

Use the original filename from the Drive metadata (`name` field). If metadata was not fetched, derive the filename from the link or ask the user.

Then confirm:
```
Downloaded: {filename} → /workspace/downloads/{filename}
Size: {size}
```

---

## Token reuse and expiry

- Reuse `GDRIVE_TOKEN` for all downloads within the same conversation — do not ask again unless a 401 is returned on a subsequent call.
- If a 401 appears on a later call (token expired — they last ~1 hour), tell the user: "Your token has expired. Please get a new one from the OAuth Playground and paste it here." Then repeat from Step 3.
- Never log, store to disk, or include the token in any file written to the workspace.

---

## Error reference

| Response | Meaning | Action |
|---|---|---|
| 403 + `"The caller does not have permission"` | File not shared with this account | Tell user to check sharing settings on the file |
| 403 + `"storageQuota"` | Drive storage issue | Report to user |
| 404 | File not found or ID wrong | Ask user to re-share the link |
| 429 | Rate limit | Wait 10s and retry once |
| HTML page instead of file content | Large file confirmation or login wall | Re-fetch with `&confirm=t` param; if still HTML, treat as auth required |
