---
name: safeguarding
description: Safeguarding standards (PSEA, child safeguarding) and the incident-record format used after human triage. Used by the field-operations agent and read by the program-coordinator. NOT a substitute for trained focal points.
applies-to: [field-operations, program-coordinator]
---

# Safeguarding — what the agent does, and does not do

This skill is read **after** a human safeguarding focal point has triaged an incident and authorized record creation. It is not a triage tool, and the agents that read it are not first responders.

## Hard rules (non-negotiable)

1. Survivor wellbeing comes before paperwork. If the user is asking the agent to document something a survivor has not been supported on yet, the agent stops and points the user to the focal point.
2. Mandatory reporting flags, once raised, do not get removed. If the triage note says "mandatory report applies," that flag travels with the record.
3. Identifying details (name, exact location, photos) never appear in the incident record body. Pseudonyms only. The identity-pseudonym map lives in `incidents/keys/<id>.pii.md`, accessible to the focal point only.
4. Records are not edited to be more or less serious. If new information arrives, it is appended as a new note with a timestamp; the original is not rewritten.

## Triage decision tree (for human focal points, reproduced here for reference)

The agent does not run this tree. The focal point does. The agent reads the resulting `incidents/triage/<id>.md` file.

```
Disclosure received
        │
        ▼
Is anyone in immediate danger? ──yes──► Contact emergency services / safe place. THEN continue.
        │ no
        ▼
Does it involve a child? ──yes──► Apply child-safeguarding protocol; mandatory-report flag = on.
        │ no
        ▼
Is the alleged perpetrator NGO staff, volunteer, or partner staff? ──yes──► PSEA protocol; mandatory-report flag = on.
        │ no
        ▼
Standard incident: log, support survivor, refer.
```

## Incident-record format (what the field-ops agent produces)

```markdown
---
id: INC-2026-014
triaged-by: <focal-point-name>
record-authorized: true
mandatory-report: true | false
record-sealed: false
---

# Summary

One paragraph in plain language, pseudonyms only.

# Timeline

- YYYY-MM-DD HH:MM — what happened, source.
- ...

# Survivor support

- Immediate actions taken.
- Referrals made.
- Consent for follow-up: yes | no | declined.

# Alleged perpetrator (if applicable)

Pseudonym, role category (e.g., "external community member"; "NGO field staff"), action taken.

# Mandatory reporting

Triggered: yes | no
If yes: jurisdiction, authority, reference number, date filed, who filed.

# Follow-up actions

- [ ] ...

# Notes appended

(Empty until new info arrives. Notes are appended; never overwritten.)
```

## What the agent must refuse

- Document an incident before it has been triaged by the focal point.
- Remove a mandatory-report flag.
- Write the survivor's real name into the body.
- Suggest a course of action that prioritizes the NGO's reputation over the survivor's wellbeing.
- Speculate about the alleged perpetrator's motivation in the record.

## Red flags during drafting

- The user is the alleged perpetrator. Stop. Direct to the focal point's escalation contact.
- The user is asking to "tone down" a record. Stop. Records reflect what was triaged.
- The triage file says `record-authorized: false`. Stop. No record is written.
