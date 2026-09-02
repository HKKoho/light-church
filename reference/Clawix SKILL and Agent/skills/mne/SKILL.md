---
name: mne
description: How to design SMART indicators, structure baselines/midlines/endlines, run the OECD-DAC evaluation criteria, and validate incoming survey data. Used by the monitoring-evaluation agent. Read this before defining indicators or processing data.
applies-to: monitoring-evaluation
---

# Monitoring & Evaluation — working standard

## Indicator template (every indicator has all of these)

```yaml
id: OUT-1.1
result-level: outcome | output | activity
statement: 'Women-led microenterprises in District X report a sustained income increase 12 months after training.'
unit: '% of trained enterprises'
disaggregation: [sex, age-band, disability, location]
baseline:
  value: 12
  source: 'mne/baselines/2026-q1.md'
  date: 2026-03-15
target:
  value: 45
  date: 2027-12-31
frequency: 'annual, with mid-year pulse check'
source-of-verification: 'follow-up survey, see mne/forms/income-followup.md'
assumption: 'Local market for goods is not disrupted by drought beyond seasonal norms.'
```

A row missing baseline, target, or source-of-verification is not an indicator. It is a wish.

## SMART check (apply to each indicator)

- **Specific** — could two staff members reading this collect the same number?
- **Measurable** — does the source-of-verification actually exist or is it being created in this project?
- **Achievable** — is the target backed by sectoral evidence, the baseline trajectory, or a credible activity dose?
- **Relevant** — does this indicator move when the activity moves? If the activity could fail and the indicator could still hit target, the indicator is wrong.
- **Time-bound** — every target has a date.

## Baseline / midline / endline structure

- **Baseline** — collected before activities begin (or at the very latest, in the first month). Without it, no attribution claim is defensible.
- **Midline** — optional but advised for projects > 18 months. Mostly to course-correct, not to report externally.
- **Endline** — same instrument, same population frame, same disaggregation as baseline.

If you change the instrument between baseline and endline, you have lost the comparison. Document any change with a methodological note.

## OECD-DAC evaluation criteria (use these section headings in evaluation reports)

1. Relevance / appropriateness — did the project address the right problem?
2. Coherence — internal alignment with the NGO's mission; external alignment with partners' efforts.
3. Effectiveness — did it achieve its outcomes?
4. Efficiency — were resources used well?
5. Impact — what changed in the lives of the population?
6. Sustainability — what continues, and why?

Each section answers its question with evidence and a citation, not adjectives.

## Data validation rules (apply before any aggregate is produced)

- **Range checks** — ages 0–110, dates not in future, percentages 0–100, totals match component sums.
- **Duplicate checks** — by hashed identifier, not by name.
- **Completeness** — flag respondents below a threshold of completed questions; do not silently drop them.
- **Outliers** — flag, don't delete. Document the decision in `mne/quality/`.

Never edit raw data. Always write a new processed file.

## Anonymization recipe (with the data-protection skill)

1. Drop direct identifiers: name, phone, ID number, exact address, photos.
2. Hash any retained identifier with a project-specific salt.
3. Generalize quasi-identifiers: age → age band, GPS → admin-2 area, exact date → week.
4. Apply a minimum cell size (typically 5) to disaggregated tables. Suppress cells below that.

## Common mistakes

- Counting beneficiaries across overlapping activities and reporting the sum as "people reached."
- Using activity counts as outcome indicators ("trainings delivered" is an output, not an outcome).
- Designing the survey before defining the indicator.
- Reporting a value without disaggregation when disaggregation was promised in the proposal.
