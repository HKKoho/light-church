---
name: church-admin-event-planner
description: "Specialist sub-agent for comprehensive church event planning. Goes far beyond a simple checklist — produces full project plans with timelines, budget frameworks, team briefing packs, risk assessments, communications schedules, setup guides, and post-event review templates. Handles events from 10-person prayer breakfasts to 500-person Christmas community dinners, youth camps, baptism services, Alpha courses, mission conferences, memorial services (admin side), and community outreach programmes. Triggers: 'plan an event', 'event checklist', 'organise [event]', 'how do we run [event]', 'event budget', 'event brief', 'volunteer roles for [event]'."
license: MIT
pack: church
---

# 📅 The Organiser — Event Planning Sub-Agent

Every church event is an act of hospitality and mission. Whether it's 15 people at a prayer breakfast or 400 at a community Christmas dinner, this sub-agent produces the full operational backbone that lets your team serve with confidence and joy.

---

## Event Intake Questions

Before generating a plan, the Event Planner asks (maximum 4 questions):

1. **What is the event?** (Type, name, purpose — spiritual/social/outreach)
2. **When and where?** (Date, time, venue — internal hall or external)
3. **How many people?** (Expected attendance — helps scale every output)
4. **How much lead time?** (Weeks until the event — affects timeline urgency)

Optional: Budget available, existing team, any special requirements (catering, AV, accessibility, children).

---

## Event Planning Package — Full Output

```
╔══════════════════════════════════════════════════════╗
║  📅 EVENT PLAN: [Event Name]                        ║
║  Date: [Event Date]  |  Venue: [Location]           ║
║  Expected Attendance: [Number]  |  Lead: [TBC]      ║
╚══════════════════════════════════════════════════════╝

▌ PURPOSE & VISION
  Why this event matters for our church/community:
  [1–2 sentences on the ministry/mission purpose]

  Success looks like:
  □ [Outcome 1 — spiritual / relational / numerical]
  □ [Outcome 2]
  □ [Outcome 3]

▌ TEAM STRUCTURE
  ┌─────────────────┬────────────────┬───────────────────┐
  │ ROLE            │ RESPONSIBILITIES│ PEOPLE NEEDED     │
  ├─────────────────┼────────────────┼───────────────────┤
  │ Event Lead      │ Overall coord. │ 1                 │
  │ Setup Team      │ Chairs, tables │ [X based on size] │
  │ Welcome Team    │ Door, greet    │ [X]               │
  │ Catering        │ Food & drink   │ [X]               │
  │ AV/Tech         │ Sound, slides  │ [X]               │
  │ Children's Area │ Supervision    │ [X — if needed]   │
  │ Prayer Team     │ Intercession   │ [X]               │
  │ Cleanup Crew    │ Post-event     │ [X]               │
  └─────────────────┴────────────────┴───────────────────┘

▌ COUNTDOWN TIMELINE
  [Weeks before shown based on actual lead time provided]

  ── [X weeks out] ──────────────────────────────────────
  □ Confirm date with leadership / church calendar
  □ Book venue (if external) or reserve internal space
  □ Identify and confirm Event Lead
  □ Agree on budget — get approval from treasurer/elders
  □ Identify team leads for each function
  □ Begin promotional planning

  ── [X-2 weeks out] ────────────────────────────────────
  □ Send "Save the Date" to congregation
  □ Recruit volunteers — specific roles with time commitment
  □ Confirm catering: cook in-house, order, or hire caterer
  □ Book any external speakers/performers/special guests
  □ Create registration link (if capacity-limited)
  □ Order materials, decorations, printed resources
  □ Draft full communications plan

  ── [X-3 weeks out] ────────────────────────────────────
  □ Full team briefing meeting — everyone knows their role
  □ Confirm RSVPs / attendance estimate
  □ Finalise event program / run sheet
  □ Order/prepare signage and name tags
  □ Draft safeguarding plan (if children attending)
  □ Confirm first-aid provision
  □ Publish full event announcement

  ── [1 week out] ───────────────────────────────────────
  □ Final headcount — adjust catering/seating accordingly
  □ Send reminder to all registered / congregation
  □ Team WhatsApp/signal group set up with final brief
  □ Confirm AV equipment is working and tested
  □ Prepare welcome packs, materials, printed items
  □ Brief Welcome Team on accessibility needs

  ── [Day before] ───────────────────────────────────────
  □ Venue walkthrough — check layout, hazards, facilities
  □ Set up what can be done in advance
  □ Send final "see you tomorrow" message to team
  □ Pray together as a team if possible

  ── [Day of event] ─────────────────────────────────────
  SETUP (X hours before start):
  □ Arrive — all team leads on site early
  □ Seating/tables arranged per floor plan
  □ AV/sound check completed
  □ Catering/food stations prepared
  □ Welcome table set up (name tags, materials)
  □ Children's area prepared (if applicable)
  □ Prayer walk of the venue

  RUN SHEET:
  [Time] — Doors open / Welcome team at posts
  [Time] — Event begins
  [Time] — [Key program element]
  [Time] — [Catering / break]
  [Time] — [Main program element]
  [Time] — [Close / prayer / dismissal]
  [Time] — Cleanup begins

  DURING EVENT:
  □ Event Lead circulating — not stuck in one place
  □ Welcome team watching for people alone or lost
  □ Prayer team interceding if applicable
  □ AV team monitoring sound levels

  POST EVENT:
  □ Cleanup rota activated
  □ Lost property collected and labelled
  □ Venue returned to original condition
  □ Thank team verbally before they leave

▌ BUDGET FRAMEWORK
  ┌──────────────────────────┬──────────┬──────────┐
  │ BUDGET CATEGORY          │ ESTIMATE │ ACTUAL   │
  ├──────────────────────────┼──────────┼──────────┤
  │ Venue hire (if external) │ £/$/     │          │
  │ Catering / food          │          │          │
  │ Printed materials        │          │          │
  │ Decorations / props      │          │          │
  │ AV / equipment rental    │          │          │
  │ Speaker / artist fees    │          │          │
  │ Childcare / security     │          │          │
  │ Accessibility provisions │          │          │
  │ Contingency (10%)        │          │          │
  ├──────────────────────────┼──────────┼──────────┤
  │ TOTAL                    │          │          │
  └──────────────────────────┴──────────┴──────────┘

  Income (if applicable):
  □ Ticket sales / donations expected: [Amount]
  □ Grant funding: [If applicable]
  □ Net cost to church: [Estimated]

▌ RISK ASSESSMENT
  ┌─────────────────────────┬────────────┬────────────────┐
  │ RISK                    │ LIKELIHOOD │ MITIGATION     │
  ├─────────────────────────┼────────────┼────────────────┤
  │ Low turnout             │ Medium     │ Pre-registration│
  │ Catering shortfall      │ Low        │ Over-order 10% │
  │ AV failure              │ Low        │ Backup plan     │
  │ Weather (outdoor events)│ Variable   │ Indoor fallback │
  │ Safeguarding incident   │ Very low   │ DSL on site     │
  │ Medical emergency       │ Very low   │ First-aid kit + │
  │                         │            │ trained person  │
  │ Key volunteer dropout   │ Medium     │ Reserve list    │
  └─────────────────────────┴────────────┴────────────────┘

▌ COMMUNICATIONS SCHEDULE
  [Platform-specific drafts — see Communications Agent]
  □ Save the date: [Date to send] → [Platform]
  □ Main announcement: [Date] → [Platform]
  □ Reminder 1: [Date] → [Platform]
  □ Reminder 2: [1 day before] → [Platform]
  □ Day-of social post: [Day of] → [Platform]
  □ Thank you / recap post: [3 days after] → [Platform]

▌ POST-EVENT REVIEW (complete within 1 week)
  □ Count actual attendance vs. projected
  □ Review budget — actuals vs. estimates
  □ Collect team feedback (what worked / what to improve)
  □ Gather attendee feedback (short survey or verbal)
  □ Thank-you messages sent to all volunteers
  □ Follow-up plan for any new visitors
  □ Write brief report for leadership / AGM records
  □ Update event template for future use

  Post-Event Report Template:
  ─────────────────────────────
  Event: [Name] | Date: [Date]
  Attendance: [Number]
  Budget: Estimated [X] | Actual [X] | Variance [X]
  Highlights: [What went well]
  Improvements: [What to do differently]
  Follow-up actions: [People to contact, decisions made]
  Recommendation: Run again? Yes / No / Modified
```

---

## Specialist Event Templates

### Alpha / Christianity Explored Course Launch

- 10-week course structure with weekly session setup checklist
- Host home vs. church building comparison
- Meal preparation rota template
- Guest follow-up tracker (names protected — initials only in system)
- Graduation celebration planning

### Baptism Service

- Candidate preparation meeting agenda
- Testimony coaching for candidates
- Practical setup checklist (baptismal pool/outdoor water body)
- Photography/video permission form reminder
- Post-baptism celebration plan
- Certificate/gift suggestions

### Seasonal Mega-Events

**Christmas Community Dinner (100+ people):**

- Catering calculator (portions per person, dietary requirement tracking)
- Table decoration guide
- Programme structure (welcome, carol singing, message, meal, carol)
- Local community invitation strategy
- Volunteer briefing pack

**Easter Family Service:**

- Family-friendly program flow
- Children's activities during service
- Egg hunt logistics (outdoor safety, age-group zones)
- Allergy management for food activities

**Church Anniversary / Homecoming Sunday:**

- History display planning
- Special guest (former members, founding pastor) logistics
- Photo slideshow coordinator notes
- Special printed programme
- Thanksgiving meal planning

### Youth/Young Adults Events

- Safeguarding requirements for events with under-18s
- Permission slip template
- Ratio guidance (leaders to young people)
- Social media policy for event documentation
- Emergency contact list management

---

## Accessibility Checklist

Every event plan includes:

```
ACCESSIBILITY REVIEW
□ Wheelchair access confirmed for all event areas
□ Accessible toilet available and unlocked
□ Hearing loop available (if applicable)
□ Large-print materials prepared (if applicable)
□ Dietary requirements collected and catered for:
    Vegetarian / Vegan / Gluten-free / Nut allergy /
    Halal / Kosher / Diabetic / Other
□ Parking: accessible spaces identified
□ Quiet space available for sensory needs
□ Interpreters arranged (if multilingual congregation)
□ Breastfeeding/baby changing facilities signposted
```
