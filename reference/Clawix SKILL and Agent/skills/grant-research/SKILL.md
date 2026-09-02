---
name: grant-research
description: How to scan supporters for fit against the NGO's mandate — eligibility checks, fit scoring, deadline tracking. Used by the donor-engagement agent. Read before doing a "find me supporters for X" task.
applies-to: donor-engagement
---

# Supporter scanning — working standard

A scan is not a wish list of every funder remotely related to a topic. It is a filtered, ranked, decision-ready list. The Executive Director should be able to take three minutes to read it and decide which two to pursue.

## Sources to use (allowlisted)

- ReliefWeb — emergencies and humanitarian.
- Devex Funding — broad bilateral and multilateral.
- Supporter websites directly — FCDO, USAID, ECHO, GAC, SDC, BMZ.
- Candid (formerly Foundation Center) — US private foundations.
- Government registries in the country of operation — local funders.

## Filter sequence (apply in this order — fail fast)

1. **Geographic eligibility.** Does the funder fund work in our country / region? If no, drop.
2. **Thematic fit.** Does the funder's stated priority match our program? If no, drop.
3. **Organization-type eligibility.** Are we eligible to apply directly, or only via a consortium? Note which.
4. **Grant-size band.** Is the typical award within an order of magnitude of what we need? If a $5M-minimum funder shows up for a $200k need, drop.
5. **Deadline feasibility.** Can a credible application be assembled by the deadline given current bandwidth? If not, note as "next cycle."

A supporter that fails any of the first four filters is dropped, not "noted for later."

## Fit scoring (1–5)

| Score | Meaning                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------- |
| 5     | Strong thematic and geographic fit; we have past performance that maps; eligibility is clear; deadline is workable. |
| 4     | Good fit; one of the four conditions is mildly stretched.                                                           |
| 3     | Plausible fit; meaningful repositioning needed in the proposal.                                                     |
| 2     | Weak fit; only worth pursuing if a partner takes the lead.                                                          |
| 1     | Mentioned for completeness; recommend skipping.                                                                     |

Anything 1 or 2 should not appear in the recommended list — only in an appendix if requested.

## Output format

```markdown
# Supporter scan: <topic> — <date>

## Recommended (score 4–5)

| Supporter       | Mechanism | Geog  | Theme               | Size      | Deadline   | Fit | Rationale                                                                                    | Source    |
| --------------- | --------- | ----- | ------------------- | --------- | ---------- | --- | -------------------------------------------------------------------------------------------- | --------- |
| FCDO Ghana CSSF | RFA       | Ghana | Conflict prevention | £200k–£1M | 2026-07-15 | 5   | Thematic match to program X; we are eligible directly; we have a 2024 reference deliverable. | https://… |

## Worth tracking (score 3)

| ... |

## Appendix: drop reasons (score 1–2)

| Supporter    | Drop reason                                         |
| ------------ | --------------------------------------------------- |
| Foundation Y | Funds only US-based 501(c)(3); we are not eligible. |
```

Each row's source URL must be in the allowlist. If a row needs a non-allowlisted source, surface the URL to the user before adding it.

## Common mistakes

- Listing every supporter mentioned on a sector blog without checking eligibility.
- Padding the list with funders the NGO has already been rejected by — without flagging that history.
- Ranking by grant size rather than fit. A $5M misfit is worse than a $100k strong match.
- Missing the deadline check. The most common reason a "great" opportunity rots in the pipeline.

## Output discipline

A scan has a date in the filename. Supporters change priorities. A scan from six months ago is a starting point, not a current view.
