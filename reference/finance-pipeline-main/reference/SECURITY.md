# Security — Trust Boundary Documentation

## Core Principle

> The system is designed so that **no credentials, passwords, OTPs, or session tokens
> ever enter the application codebase, database, or AI pipeline.**

Authentication is entirely owned by the human client. The system only operates
on data that is already accessible in an authenticated session the client established.

---

## Trust Boundary Diagram

```
┌─────────────────────────────────────────────────────┐
│  CLIENT'S TRUST ZONE                                │
│                                                     │
│  - Bank website (browser)                           │
│  - Login credentials (never leave this zone)        │
│  - 2FA / OTP device                                 │
│  - Authenticated browser session                    │
│                                                     │
│  ──────────── TRUST BOUNDARY ──────────────────     │
│              (session handoff only)                 │
└──────────────────────┬──────────────────────────────┘
                       │ CDP port attach (read-only)
┌──────────────────────▼──────────────────────────────┐
│  FINPIPELINE SYSTEM ZONE                            │
│                                                     │
│  Layer 1: reads DOM/tables from authenticated page  │
│  Layer 2: processes transaction records only        │
│  Layer 3: generates reports                         │
│                                                     │
│  Nothing in this zone ever sees a password or OTP   │
└─────────────────────────────────────────────────────┘
```

---

## What the System Never Does

| Action | Status | Reason |
|--------|--------|--------|
| Store bank passwords | ❌ Never | Not collected at any point |
| Store OTP / 2FA codes | ❌ Never | Not collected at any point |
| Replay or reuse sessions | ❌ Never | Each run requires fresh human login |
| Send credentials to LLM | ❌ Never | LLM only receives transaction data |
| Log raw session cookies | ❌ Never | Session attachment is transient |
| Access bank APIs with stored tokens | ❌ Never | All access is human-initiated |

---

## What the System Does

| Action | Layer | Notes |
|--------|-------|-------|
| Attach to client's open browser session | 1 | Via CDP, read-only navigation |
| Extract visible table data from authenticated pages | 1 | No auth involved |
| Log extraction metadata (timestamp, run ID, bank ID) | 1 | No financial data in logs |
| Process raw transaction records | 2 | Text/numbers only |
| Send transaction descriptions to LLM for classification | 2 | No PII, no credentials |
| Write classified records to data warehouse | 2 | Encrypted at rest |
| Push reports to client's Excel/SharePoint | 3 | Via Power Automate connector |

---

## Audit Trail

Every pipeline run generates an immutable audit record containing:
- Run ID (uuid)
- Client user ID (not credentials)
- Bank identifier
- Timestamp of extraction start/end
- Record count extracted
- Classification model used
- Any validation flags raised

Audit records are append-only and cannot be modified post-creation.

---

## Regulatory Alignment

| Jurisdiction | Regulation | How this design complies |
|--------------|------------|--------------------------|
| Macau | AMCM data protection guidelines | No credential storage, human-initiated access |
| Singapore | MAS TRM Guidelines | Audit trail, access logging, no credential delegation |
| Malaysia | BNM RMiT | Human authentication, no automated credential reuse |
| General | GDPR / PDPA principles | Minimal data collection, purpose limitation |

---

## Recommended Client Security Practices

Advise clients to:
1. Use a dedicated machine or browser profile for extractions
2. Run extractions on a secured network (not public WiFi)
3. Log out immediately after extraction completes
4. Not leave the authenticated session unattended during extraction
5. Review the audit log after each pipeline run
