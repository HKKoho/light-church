---
name: data-protection
description: Beneficiary data handling — consent capture, anonymization, GDPR-aligned retention, and the file-marking conventions every agent in this configuration honors. Read before processing or sharing data that involves identifiable people.
applies-to:
  [donor-engagement, monitoring-evaluation, communications, field-operations, program-coordinator]
---

# Data protection — operational rules

Two principles drive everything below.

1. **Beneficiaries are data subjects, not content.** They have rights to information, consent, withdrawal, correction, and deletion. The NGO holds those rights in trust.
2. **Default to less.** Collect less, retain less, share less. Every additional piece of identifying data is a risk you carry indefinitely.

## File-marking conventions (every agent honors these)

- Filename suffix `.pii.md` → contains direct identifiers. Restricted access. Never read into another file's body verbatim.
- YAML frontmatter `pii: true` → same restriction.
- YAML frontmatter `consent: shareable` (with sub-fields `consent-type: named|pseudonym|anonymous` and `consent-scope: <list>`) → may be cited or quoted within scope.
- No frontmatter / no marking → treat as not shareable. Refuse to quote, refuse to publish.

## Consent capture (what the field team should be doing)

The agents do not capture consent. They check whether it was captured. The capture form should record:

- Date and place of consent.
- Who explained the use case, in what language.
- What the data will be used for (specific list, not "future communications").
- Whether the person agrees to: name use, photo use, quote use, story use, contact for follow-up.
- The right to withdraw, and the contact to do so.

If any field is blank, default that use to "no."

## Anonymization recipe (paired with the M&E skill)

For aggregate reporting:

1. Drop direct identifiers (name, phone, government ID, exact address, photos, voice recordings).
2. Hash any retained identifier with a project-specific salt (the salt itself is not stored alongside the hash).
3. Generalize quasi-identifiers: age → 5- or 10-year bands; GPS → admin-2 polygon; exact date → ISO week.
4. Apply a minimum cell size of 5 in cross-tabs. Suppress smaller cells.
5. Re-identification check: pick three real records, attempt to find them in the anonymized output. If you can, generalize further.

## Retention

- Survey raw data: retain only as long as the supporter agreement requires, plus statutory minimum.
- Beneficiary contact details for follow-up: retain only as long as consent is current.
- Safeguarding records: per the NGO's safeguarding policy, typically much longer; access is restricted not deleted.
- Supporter proposal drafts: retain. They become institutional memory.

## Cross-border transfers

If beneficiary data leaves the country where it was collected, check:

- Local data-protection law (GDPR for the EU, the country's own act elsewhere).
- The supporter agreement's data clauses.
- Whether a Data Processing Agreement is in place with any cloud provider involved.

If any of these is unclear, refuse the transfer and surface the question to the AI Assistant Owner.

## Things the agents must refuse

- Copy a `.pii.md` file's contents into a non-PII file.
- Quote a beneficiary by name without `consent: shareable` and `consent-type: named`.
- Email beneficiary lists to anyone, anywhere, regardless of who asks.
- Share precise GPS, exact date of birth, or photo of an identifiable beneficiary in any external draft.
- Train, fine-tune, or feed beneficiary data to any external model. Period.

## Things the agents do well

- Produce aggregate tables that respect minimum cell size.
- Generate consent-form templates.
- Audit existing files for missing consent markings and produce a `data-protection/audit-YYYY-MM-DD.md` listing files needing attention.
