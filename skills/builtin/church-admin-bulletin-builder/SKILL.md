---
name: church-admin-bulletin-builder
description: "Specialist sub-agent that assembles complete, polished church bulletins, orders of service, weekly sheets, digital service programs, and monthly newsletters from provided inputs. Handles: weekly Sunday bulletin, digital/print versions, multilingual bulletins, special service programs (Christmas, Easter, Baptism, Communion, Funeral), monthly congregation newsletters, and mid-week email digests. Produces structured text output ready for design software (Word, Canva, Publisher) or direct digital distribution. Triggers: 'bulletin', 'order of service', 'weekly sheet', 'service program', 'newsletter', 'congregation email', 'digital bulletin'."
license: MIT
pack: church
---

# 📰 The Publisher — Bulletin Builder Sub-Agent

The weekly bulletin is the congregation's front door — it sets the tone for worship, informs the community, and carries the church's heartbeat into people's hands. This sub-agent builds it well, every time.

---

## Input Collection

Before building any bulletin, confirm these inputs (flagging what's missing):

```
BULLETIN INPUTS CHECKLIST
─────────────────────────────────────────────
Required:
  □ Church name
  □ Date / Sunday name (e.g. "Third Sunday of Advent")
  □ Service time(s)
  □ Preacher name
  □ Sermon title and Scripture reference
  □ Worship leader name

Optional (will add if provided, skip if not):
  □ Order of service / song list
  □ Announcements (max 4 recommended)
  □ Upcoming events (max 5)
  □ Prayer requests (approved for sharing)
  □ Verse of the week
  □ Giving information
  □ Ministry spotlight
  □ Visitor welcome message
  □ Contact information / social media
```

---

## Weekly Sunday Bulletin — Full Template

```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║           ✝  [CHURCH NAME]  ✝                       ║
║                                                      ║
║    [Sunday Date] · [Service Time(s)] · [Venue]      ║
╚══════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                   WELCOME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Warm 1–2 sentence welcome. Season-appropriate. Inclusive
of first-time visitors.]

If this is your first time with us — we are so glad you're here.
Please speak to anyone in a [colour] lanyard to find out more
about our community.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  TODAY'S SERVICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Sermon:         [Title]
  Scripture:      [Reference]
  Preacher:       [Name]
  Worship:        [Name / Team]

ORDER OF SERVICE
  [Time or sequence — if provided]
  ▸ Welcome & Notices
  ▸ [Song 1]
  ▸ Prayer
  ▸ [Song 2–3]
  ▸ Scripture Reading — [Reference]
  ▸ Sermon — [Title]
  ▸ Response & Prayer
  ▸ Giving
  ▸ [Closing Song]
  ▸ Benediction

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
             📖 VERSE OF THE WEEK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "[Verse text — chosen to align with sermon theme]"
  — [Reference]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                 📌 NOTICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[NOTICE 1 HEADLINE]
[2–3 lines: what, when, who it's for, one action step]

[NOTICE 2 HEADLINE]
[2–3 lines]

[NOTICE 3 HEADLINE]
[2–3 lines]

[NOTICE 4 HEADLINE — max recommended for print]
[2–3 lines]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               📅 COMING UP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [Day, Date]   [Event Name]             [Time]
  [Day, Date]   [Event Name]             [Time]
  [Day, Date]   [Event Name]             [Time]
  [Day, Date]   [Event Name]             [Time]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                🙏 PRAYER FOCUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Please hold in prayer this week:
  • [Approved prayer request 1]
  • [Approved prayer request 2]
  • [Mission partner / global focus]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  💛 GIVING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Thank you for your faithful generosity.
  You can give:
  • Online: [URL]
  • Bank transfer: [Details]
  • Cash/cheque: offering envelope at the door
  • Gift Aid: speak to [Name/Treasurer]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                CONNECT WITH US
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🌐 [Website]   📧 [Email]   📱 [Social links]
  📞 [Phone]     📍 [Address]

  Children's Ministry: [Info / where to go]
  Accessibility: [Loop system / wheelchair access note]
  Safeguarding Lead: [Name, contact method]
```

---

## Special Service Programs

### Christmas Eve / Day Program
Expanded format with:
- Carol lyrics (public domain only — pre-1928 publication or out of copyright)
- Nativity program script section
- Special candle-lighting liturgy
- Family-friendly language throughout
- "Invite a friend" perforated section

### Good Friday Service
Solemn, stripped-back format:
- Stations of the Cross numbering (if used)
- Responsive readings: Isaiah 53, Psalm 22, Lamentations
- Silence indicators (a rarity in church bulletins — specify duration)
- No upbeat notices — pastoral and focused

### Easter Sunday Program
Celebratory, vibrant format:
- Resurrection call-and-response liturgy
- "He is risen! He is risen indeed!" moments marked
- Baptism section (if applicable)
- Extra welcome section for seasonal visitors (Christmas/Easter congregants)
- Children's activities noted

### Baptism Service Order
- Candidate names and brief testimony space
- Meaning of baptism explanation (for visitors unfamiliar)
- Vows text printed for congregation to witness
- Space for photos/celebration note

### Funeral / Memorial Service Order
Gentle, dignified format:
- No notices, no giving appeals
- Longer Scripture section
- Space for eulogy timing
- Words of comfort for those outside the faith
- Printed words for congregational responses

---

## Monthly Newsletter Builder

```
══════════════════════════════════════════════════════
              [CHURCH NAME]
          Monthly Newsletter — [Month, Year]
══════════════════════════════════════════════════════

FROM THE PASTOR
  [Space for pastor's personal letter — 150–250 words
   Tone: pastoral, warm, vision-carrying, not administrative]

──────────────────────────────────────────────────────
📖  SERIES THIS MONTH: [Sermon Series Name]
    Join us each Sunday as we explore [theme].
    Sundays at [times]. All welcome.

──────────────────────────────────────────────────────
✨  MINISTRY HIGHLIGHTS
    [Story 1: What God has been doing — 80 words]
    [Story 2: Ministry update — 80 words]
    [Story 3: Community impact — 80 words]

──────────────────────────────────────────────────────
📅  THIS MONTH'S CALENDAR
    [Date] — [Event]
    [Date] — [Event]
    [Date] — [Event]
    [Full calendar including regular groups]

──────────────────────────────────────────────────────
🌟  SPOTLIGHT
    [Member story / ministry team feature / mission partner update]
    [150 words, first-person where possible]

──────────────────────────────────────────────────────
🙏  PRAYER FOCUS
    This month, we are praying for:
    • Our local community: [Specific need]
    • Our nation: [Current prayer focus]  
    • Our global mission partners: [Name + brief update]
    • Our congregation: [General pastoral focus]

──────────────────────────────────────────────────────
📋  NOTICE BOARD
    [Community events, local charity needs, venue hire info]
    [Job listings from congregation if applicable]

──────────────────────────────────────────────────────
💰  STEWARDSHIP UPDATE
    [Brief, dignified giving update — if church shares this]
    [Year-to-date vs. budget — optional]

──────────────────────────────────────────────────────
CONNECT: [Website] | [Email] | [Social] | [Phone]
══════════════════════════════════════════════════════
```

---

## Digital vs. Print Formatting Notes

The Bulletin Builder produces output annotated for both:

**For Print:**
- Section headers clearly marked for design layout
- Note: keep to A4 or A5 folded — max 4 sides
- Suggest font sizes for readability (body: min 11pt)
- Flag any content that needs visual hierarchy treatment

**For Digital (Email / WhatsApp / Social):**
- Shorter notices (150 words max per notice)
- Single-column format
- Clear call-to-action links
- Plain text version available for email clients

---

## Quality Assurance Checklist

Auto-run before every bulletin output:

```
BULLETIN QA CHECKLIST
□ Church name correctly spelled
□ Date confirmed (not last week's date)
□ Sermon title and Scripture match
□ All event dates correct and in the future
□ Prayer requests approved for public sharing
□ No sensitive pastoral information included
□ Giving information accurate (check bank details!)
□ Accessible language — no jargon for visitors
□ Safeguarding contact included (for events with minors)
□ Word count appropriate for print format

⚠️ FINAL REVIEW: A human must approve before printing
   or distributing to the congregation.
```
