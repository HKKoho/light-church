# Phase 2 Development Backlog

This document tracks deferred architectural improvements for clawix-ngo.
Items here were consciously accepted as known gaps and are not urgent for
current NGO operations — but should be addressed before scaling or handling
highly sensitive beneficiary data.

---

## P2-001 — Isolated Python Execution (Separate Runner Container)

**Status:** Deferred — accepted risk for Phase 1  
**Priority:** Medium  
**Effort:** High

### Background

In clawix-ngo, the agent container is built on `python:3.12-slim`. Python is
available as a binary inside every `clawix-agent-xxxx` container and is invoked
via the `shell` tool using `docker exec`. No separate Python runner container
exists.

The upstream `clawix/` project uses a dedicated `clawix-python-runner-xxxx`
container, spawned on demand via the `python_run_net` tool, with its own
network policy and resource limits.

### Why this is accepted now

- `--network none` on agent containers prevents Python from exfiltrating data
  over the network
- UID 1000 (non-root) limits filesystem writes to `/workspace`
- PID 256 cap limits subprocess chains
- LLM agents are cooperative, not adversarial
- NGO workloads are low-volume and staff-facing

### Known security/governance gaps (to resolve in Phase 2)

1. **Deny-list bypass** — `shell.ts` deny patterns check shell command strings
   but do not inspect Python code passed via `python3 -c "..."`. An agent can
   call `subprocess.run(['rm', '-rf', '/workspace'])` from inside Python and
   bypass the deny-list.

2. **No execution isolation** — Agent memory, workspace files, and Python
   execution share the same container filesystem. A Python script can read all
   session context and uploaded files.

3. **No per-execution audit log** — Python runs are logged as a single shell
   tool call. What the Python code actually does (file reads, computations)
   is not separately audited.

4. **Shared resource limits** — The PID 256 / CPU 0.5 / mem 512 MB caps are
   shared between the agent process and any Python subprocesses it spawns.

### Interim mitigation already applied (Option 1)

Python-aware deny patterns added to `shell.ts` (2026-06-13) covering:

- `subprocess.run/call/Popen/check_output/check_call` with dangerous commands
- `os.system` with dangerous commands
- `os.execv/execve/execvp` (process replacement)
- `os.fork`
- `shutil.rmtree` on root paths

Limitation: only catches inline Python (`python3 -c "..."` and heredocs).
Script-file invocations (`python3 script.py`) cannot be inspected — full
isolation requires the Phase 2 python-runner below.

### Phase 2 implementation plan

- Port `python_run_net` tool from upstream `clawix/packages/api/src/engine/tools/python/`
- Build and publish `clawix-python-runner:latest` image
  (`infra/docker/python-runner/Dockerfile`)
- Add `python-container-pool.service.ts` for warm pool management
- Apply separate network policy (`clawix-python-net-egress`) with private IP
  and cloud metadata endpoint blocking
- Add Python-specific deny patterns to `shell.ts` as an interim measure
- Update `SECURITY.md` and `GOVERNANCE.md` to reflect the new boundary

### Reference

- Upstream implementation: `clawix/packages/api/src/engine/tools/python/`
- Upstream pool service: `clawix/packages/api/src/engine/python-container-pool.service.ts`
- Related discussion: conversation on 2026-06-13 re: protobufjs@6 and container security

---

## Where `quick_validate.py` and `package_skill.py` run

These scripts live at:

```
skills/builtin/skill-creator/scripts/quick_validate.py
skills/builtin/skill-creator/scripts/package_skill.py
```

### In normal agent operation — INSIDE the container

When an agent is asked to validate or package a skill, it calls the `shell`
tool, which runs `docker exec` into the `clawix-agent-xxxx` container:

```
User: "Validate my new supporter-outreach skill"

Agent → shell tool:
  docker exec clawix-agent-a1b2c3 \
    python3 /skills/builtin/skill-creator/scripts/quick_validate.py \
            /workspace/skills/supporter-outreach

Result returned to agent, then to user.
```

The scripts run **inside** the agent container because:

- `skills/builtin/` is mounted into agent containers at `/skills/builtin/`
- `python3` is available (agent image is `python:3.12-slim`)
- The workspace skill folders are at `/workspace/` inside the container

### In developer / CI use — OUTSIDE the container (host machine)

Developers can also run these directly on the host for quick local checks:

```bash
# On host machine (requires Python 3.12+)
python3 skills/builtin/skill-creator/scripts/quick_validate.py \
        skills/custom/my-new-skill

python3 skills/builtin/skill-creator/scripts/package_skill.py \
        skills/custom/my-new-skill ./dist
```

This works because the scripts have no clawix-specific imports — they only
use Python standard library (`pathlib`, `zipfile`, `re`, `sys`) plus optional
`PyYAML` (with a fallback parser if PyYAML is absent).

### Summary

| Context                         | Where it runs              | Trigger                        |
| ------------------------------- | -------------------------- | ------------------------------ |
| Agent asked to validate a skill | Inside `clawix-agent-xxxx` | `shell` tool via `docker exec` |
| Agent asked to package a skill  | Inside `clawix-agent-xxxx` | `shell` tool via `docker exec` |
| Developer local check           | Host machine               | Direct `python3` call          |
| CI pipeline (future)            | CI runner (host-level)     | Script step in workflow        |

> Note: until P2-001 is implemented, these scripts run inside the same
> container as the agent — meaning they share the agent's filesystem access.
> Post P2-001, Python execution (including these scripts when called by an
> agent) would move to the isolated `clawix-python-runner-xxxx` container.
