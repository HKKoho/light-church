# How to Convert Proposal to PDF

You have two proposal documents ready:

1. **MARIA_DIGITAL_TWIN_PROPOSAL_SHORT.md** (398 words - recommended)
2. **MARIA_DIGITAL_TWIN_PROPOSAL.md** (full version with all details)

---

## Method 1: Using macOS Preview (Easiest)

### Step 1: Open the HTML file
```bash
open MARIA_DIGITAL_TWIN_PROPOSAL_SHORT.html
```

### Step 2: Print to PDF
1. Press `Cmd + P` (or File → Print)
2. In the print dialog, click the **PDF** button at bottom-left
3. Select **Save as PDF**
4. Name it: `MARIA_DIGITAL_TWIN_PROPOSAL.pdf`
5. Click **Save**

**Done!** You now have a professional PDF.

---

## Method 2: Using Any Word Processor

### Step 1: Open in Word/Pages/Google Docs
```bash
# For Microsoft Word
open -a "Microsoft Word" MARIA_DIGITAL_TWIN_PROPOSAL_SHORT.md

# For Pages
open -a "Pages" MARIA_DIGITAL_TWIN_PROPOSAL_SHORT.md

# Or just drag the .md file into Google Docs
```

### Step 2: Export as PDF
- **Word:** File → Save As → PDF
- **Pages:** File → Export To → PDF
- **Google Docs:** File → Download → PDF Document

---

## Method 3: Using Chrome/Safari Browser

### Step 1: Open the HTML file in browser
```bash
open -a "Google Chrome" MARIA_DIGITAL_TWIN_PROPOSAL_SHORT.html
# or
open -a "Safari" MARIA_DIGITAL_TWIN_PROPOSAL_SHORT.html
```

### Step 2: Print to PDF
1. Press `Cmd + P`
2. Click **Save as PDF** (or change Destination to "Save as PDF")
3. Save with desired filename

---

## Method 4: Install LaTeX (For Future PDF Generation)

If you want to generate PDFs directly from command line in the future:

```bash
# Install BasicTeX (smaller) or MacTeX (full)
brew install --cask basictex

# After installation, convert markdown to PDF:
pandoc MARIA_DIGITAL_TWIN_PROPOSAL_SHORT.md -o proposal.pdf \
  -V geometry:margin=1in \
  -V fontsize=11pt
```

---

## Quick Preview

To see the proposal in your terminal:

```bash
cat MARIA_DIGITAL_TWIN_PROPOSAL_SHORT.md
```

To open in default markdown editor:

```bash
open MARIA_DIGITAL_TWIN_PROPOSAL_SHORT.md
```

---

## Recommended Approach

**Use Method 1 (macOS Preview via HTML)** - it's the fastest and gives you the most control over formatting.

The HTML file already has decent styling and will print cleanly to PDF.
