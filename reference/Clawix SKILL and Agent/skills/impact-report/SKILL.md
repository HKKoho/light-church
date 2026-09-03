---
name: impact-report
description: How to write a supporter narrative report that stands up to scrutiny — structure by supporter type, evidence-citation rules, variance reporting, beneficiary-story rules. Used by the donor-engagement agent.
applies-to: donor-engagement
---

# Narrative reporting — drafting standard

## The rule that matters most

A narrative report is not marketing. It is the NGO's account of what was promised, what was done, what changed, and why. Supporters who repeat-fund are the ones who got honest reports the first time.

## Structure by supporter archetype

**Outcome-led supporters (SDC, BMZ, several private foundations):** start with what changed in the population, then trace back to activities.

**Activity-and-output supporters (some bilateral mechanisms, many emergency funds):** report activity completion and beneficiary counts first; outcomes section may be lighter but still required.

**Mixed (FCDO, USAID, ECHO, GAC):** follow the supporter's exact template. Do not reorder sections.

In all three, the variance section is non-optional.

## Section-by-section rules

### Executive summary

Half a page maximum. What was the period, what was promised, what was delivered, what shifted, what's next. No surprises later in the document.

### Context update

Has the operating environment changed? Conflict, drought, election, currency shock, partner staffing. Be specific. Supporters cross-reference this against ReliefWeb, INFORM, and their own field intel.

### Activity progress

A table: planned activity, planned dose (e.g., trainings × beneficiaries), actual dose, % of plan, brief commentary. Numbers come from `mne/processed/<period>.md`. Cite the path.

### Outcome and indicator results

A table per result statement: indicator, baseline, target, actual, % achieved, source-of-verification path, commentary. Variance > 20% in either direction needs a real explanation, not a sentence of weather.

### Beneficiary stories

Two or three. Each requires a source file with `consent: shareable` and `consent-type: named` or `pseudonym`. Each story shows the _change_, not the _suffering_. Avoid the "before they had nothing, now they smile" structure.

### Risks and mitigations

Update the risk matrix. Risks that materialized: what was the response, what is the residual. New risks: what is the mitigation.

### Financial narrative (if requested)

Variance against budget by line. Reasons. Reallocations approved by the supporter in writing only.

### Lessons and adaptations

What did the period teach the NGO? What changes in the next period? Supporters notice the absence of this section.

### Next period plan

Brief. Keyed to the workplan and any supporter-approved changes.

## Evidence-citation rules

Every numeric claim cites a path inside the workspace: `(see mne/processed/2026-q2.md, OUT-1.1)`. Every story cites its consented source: `(consented source: stories/farida.md, consent-scope: narrative-reporting)`. Supporters increasingly check.

## Variance reporting — the part most NGOs do badly

If actual is below target:

- State the percentage gap plainly.
- Explain the cause in operational terms (what did and did not happen on the ground).
- Distinguish between activity-side causes (we delivered fewer trainings) and uptake-side causes (we delivered all the trainings; people did not adopt the practice as expected).
- State what is being adjusted in the next period and why.

If actual is above target:

- State it. Don't pretend you nailed the prediction.
- Check: were beneficiaries double-counted? Was the indicator definition slipped to make the number bigger? Be honest.
- Consider whether the target was set too low and should be revised upward in the next period.

## Things that get reports rejected (or quietly downgrade the supporter relationship)

- "On track" with no underlying numbers.
- Beneficiary stories that recycle from the proposal.
- Photos of beneficiaries with no consent reference.
- Variance explanations that blame external factors only.
- Lessons section that is identical to the previous period's.
- A financial narrative that doesn't reconcile with the financial spreadsheet the finance team submitted.
