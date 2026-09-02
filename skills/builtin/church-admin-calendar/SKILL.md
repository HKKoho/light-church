---
name: church-admin-calendar
description: "Specialist sub-agent for church calendar management: annual ministry calendar planning, liturgical calendar alignment, conflict detection, seasonal planning guides, multi-ministry schedule coordination, blackout period management, and calendar publishing templates for congregation distribution. Triggers: 'calendar', 'schedule', 'what's on', 'plan the year', 'date clash', 'when should we', 'this month's schedule', 'annual planning', 'church diary'."
license: MIT
pack: church
---

# 📆 The Timekeeper — Calendar Management Sub-Agent

A church's calendar is its theology made visible. What gets scheduled shows what the community values. This sub-agent helps churches plan rhythmically, seasonally, and strategically — so the calendar serves the mission, not the other way around.

> _"There is a time for everything, and a season for every activity under the heavens."_
> — Ecclesiastes 3:1

---

## Annual Ministry Calendar Framework

### Church Year Rhythm

The sub-agent plans around two interlocking calendars:

**Liturgical Year (Christian)**

```
SEASON          │ DATES (approx)      │ TONE        │ COLOUR
════════════════╪═════════════════════╪═════════════╪════════
Advent          │ 4 Sundays before    │ Anticipation│ Purple
                │ Christmas           │ & hope      │
Christmas       │ Dec 25 – Jan 5      │ Celebration │ White/Gold
Epiphany        │ Jan 6 – Ash Wed     │ Light/reveal│ White/Green
Lent            │ 40 days to Easter   │ Repentance  │ Purple
Holy Week       │ Palm Sun – Holy Sat │ Passion     │ Red
Easter Season   │ Easter – Pentecost  │ Resurrection│ White
Pentecost       │ 50 days after Easter│ The Spirit  │ Red
Ordinary Time   │ Pentecost – Advent  │ Discipleship│ Green
```

**Civil/Community Calendar (UK — adapt globally)**

```
JANUARY     New Year, Epiphany, Week of Prayer for Christian Unity
FEBRUARY    Valentine's Day, Shrove Tuesday, Ash Wednesday
MARCH/APR   Mothering Sunday (UK), Holy Week, Easter
MAY         May Bank Holidays, Christian Aid Week, Ascension
JUNE        Pentecost, Trinity Sunday, Father's Day
JULY        Schools out — family programming shift
AUGUST      Summer recess, holiday season
SEPTEMBER   Back to school, Harvest season begins
OCTOBER     Black History Month, Harvest Festival, All Saints
NOVEMBER    All Souls, Remembrance Sunday, Advent prep
DECEMBER    Advent, Christmas events, Watch Night / New Year's Eve
```

---

## Annual Planning Template

```
[CHURCH NAME] — MINISTRY CALENDAR PLAN
Year: [Year]
Version: [Draft / Approved]  |  Prepared: [Date]

CALENDAR PRINCIPLES FOR THIS YEAR:
  1. [e.g. Every ministry has adequate space — no more than 2 major events per month]
  2. [e.g. August is a reduced-program month — congregation rest]
  3. [e.g. Calendar supports current sermon series rhythm]

FIXED ANCHOR DATES (non-negotiable):
  □ Christmas services: [Dates]
  □ Easter services: [Dates]
  □ AGM: [Date — must be within constitution requirement]
  □ Baptism Sundays: [Dates — suggested quarterly]
  □ Communion Sundays: [Frequency and dates]

══════════════════════════════════════════════════════════════

JANUARY
  Week 1:  [Service theme / sermon series start]
  Week 2:  [Regular service]
  Week 3:  [Regular service]
  Week 4:  [Regular service]
  Events:  Week of Prayer [Dates]
  Groups:  Small groups resume [Date]
  Admin:   [New year giving setup | Annual budget sign-off]

FEBRUARY
  Week 1:  [...]
  Events:  Shrove Tuesday community pancake event [Date]
           Valentine's couples dinner [Date — if applicable]
  Lent:    Ash Wednesday [Date] — special service?
           Lent study series starts [Date]

[Continue for all 12 months — full scaffold generated based on
 inputs from leadership on sermon series, special services, events]

══════════════════════════════════════════════════════════════

ANNUAL EVENTS SUMMARY
────────────────────────────────────────────────
Q1 (Jan–Mar): [Major events listed]
Q2 (Apr–Jun): [Major events listed]
Q3 (Jul–Sep): [Major events listed]
Q4 (Oct–Dec): [Major events listed]

KNOWN CONFLICTS / CLASHES: [Flag any dates that clash with
school holidays, local community events, or public holidays]

BLACKOUT / REDUCED PROGRAM PERIODS:
  □ August [weeks]: Summer recess
  □ [Other periods your church observes]

TOTAL EVENTS THIS YEAR: [Count — helps manage capacity]
  Major events (100+ people): [X]
  Medium events (25–100): [X]
  Small events (<25): [X]
  Estimated volunteer load: [X serving slots needed]
```

---

## Monthly Calendar Sheet

```
╔════════════════════════════════════════════════╗
║  [CHURCH NAME] — [MONTH YEAR] CALENDAR         ║
╚════════════════════════════════════════════════╝

  MON    TUE    WED    THU    FRI    SAT    SUN
  ─────────────────────────────────────────────
  [1]    [2]    [3]    [4]    [5]    [6]    [7]
                Bible         Prayer        SUNDAY
                Study         Mtg           Service
                7pm           7pm           10:30am
  ─────────────────────────────────────────────
  [8]    [9]    [10]   [11]   [12]   [13]   [14]
  ...
  ─────────────────────────────────────────────

KEY THIS MONTH:
  🟣 Sunday services
  🔵 Small groups / Bible study
  🟡 Prayer meetings
  🟢 Community / outreach events
  🔴 Special events
  ⭐ Key dates / church season

REGULAR WEEKLY SCHEDULE:
  Sunday [Time]: Main service
  Monday [Time]: [Group]
  Tuesday [Time]: [Group]
  Wednesday [Time]: [Group]
  Thursday [Time]: [Group]
  Friday [Time]: [Group]

NOTES FOR [MONTH]:
  • [Sermon series running this month]
  • [Seasonal focus / liturgical moment]
  • [Volunteer needs]
```

---

## Conflict Detection Protocol

When new events are submitted, the sub-agent checks for:

```
CALENDAR CONFLICT CHECK
──────────────────────────────────────────────
Proposed: [New event] on [Date] at [Time]

CHECKING AGAINST:
  ✓ Existing church events on same date
  ✓ Key volunteer availability (if team required)
  ✓ School holidays / half-term
  ✓ Major national events (Cup finals, public holidays)
  ✓ Denominational / network calendar
  ✓ Venue availability
  ✓ Competing community events (if known)

RESULT:
  □ CLEAR — no conflicts found
  □ SOFT CONFLICT — [what it is] — proceed with awareness
  □ HARD CONFLICT — [what it is] — recommend rescheduling

SUGGESTED ALTERNATIVES (if conflict): [2–3 alternative dates]
```

---

## Seasonal Countdown Guides

For each major season, the sub-agent generates a preparation timeline:

### Christmas Countdown (12 weeks out)

```
CHRISTMAS PREPARATION TIMELINE

12 weeks: Confirm Christmas service dates and times
          Begin booking any special speakers/performers
          Christmas bulletin/invite design brief

10 weeks: Announce Christmas dates to congregation
          Begin community invitation strategy
          Recruit Christmas event volunteers

8 weeks:  Christmas sermon series outline finalised
          Christmas events fully planned (see Event Planner)
          Christmas carol service rehearsals begin

6 weeks:  Main Christmas promotion push (social, print, door-to-door)
          Christmas Day service order finalised
          Children's nativity rehearsals begin

4 weeks:  Final volunteer briefing
          Christmas materials printed
          Pastoral plan for those who find Christmas difficult
            (bereavement, loneliness, family conflict — not everyone celebrates)

2 weeks:  Final RSVPs confirmed
          AV run-through for special services
          Reminder to congregation about Christmas services

Christmas Week:
  □ Mince pies, candles, carol sheets ready
  □ Welcome team briefed for seasonal visitors
  □ Christmas Day volunteers confirmed
  □ Pastoral team aware of vulnerable members during Christmas
  □ Pastor rested before Christmas Day!

Post-Christmas (January):
  □ Follow up with Christmas visitors
  □ Thank all Christmas volunteers personally
  □ Debrief on what went well / improve next year
```

---

## Calendar Publishing Formats

The sub-agent produces calendar content ready for:

**Digital Distribution:**

- Plain text format for WhatsApp/Telegram groups
- HTML email format (inline, no image dependency)
- Social media caption format (weekly "What's on" post)

**Print:**

- A5 folded monthly card format
- A4 wall calendar grid
- Bulletin insert (single column, readable at small print)

**Website:**

- Structured data format (title, date, time, location, description, contact)
- Importable .ics calendar format template

**Internal (Leadership Only):**

- Full calendar with venue notes, volunteer requirements, budget references
- Colour-coded by ministry team
