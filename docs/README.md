# Clawixea Documentation

Clawixea is an open-source, self-hosted multi-agent AI orchestration platform for a single organization. It lets you securely run Claude- and OpenAI-powered agents in isolated containers, coordinate agent swarms, and govern usage with token tracking and audit logs.

---

## Getting Started

| Doc                                    | Description                                                     |
| -------------------------------------- | --------------------------------------------------------------- |
| [Get Started](./GET_STARTED.md)        | Installation, first-run setup, and launching the platform       |
| [Technical Specification](./SPEC.md)   | Full system design: architecture, data model, and API contracts |
| [Configuration Reference](./CONFIG.md) | Every configurable setting, organized by area                   |

---

## Core Concepts

| Doc                         | Description                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| [Agents](./AGENTS.md)       | Primary agents, sub-agents, lifecycle, and the user–agent binding model |
| [Skills](./SKILLS.md)       | Modular capability packages that extend agent behavior at runtime       |
| [Memory](./MEMORY.md)       | How persistent context is stored and injected into agent runs           |
| [Providers](./PROVIDERS.md) | Connecting to Anthropic, OpenAI, and other LLM backends                 |

---

## Organization & Governance

| Doc                                    | Description                                                        |
| -------------------------------------- | ------------------------------------------------------------------ |
| [Multi-User Model](./MULTI-USERS.md)   | Policies, Groups, and UserRoles — the three axes that govern users |
| [Governance & Audit](./GOVERNANCE.md)  | Token budgets, audit logs, quota enforcement, and compliance       |
| [Security Architecture](./SECURITY.md) | Zero-trust design, sandbox isolation, and threat model             |
