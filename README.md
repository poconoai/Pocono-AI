# Sentinel Node™ — Audit Logging System
**Pocono AI, LLC — Enterprise Autonomy Architecture (EAA™)**

> *"I built this out of necessity, and I know exactly what it means to need systems that empower you."*
> — Marcus O'Dell, Founder & Chief Technologist

---

## What This Is

The Sentinel Node™ is a locally-deployed, air-gapped AI inference system for high-liability medical and legal environments. This repository contains the audit logging wrapper that sits between every user query and the local LLM — ensuring every input and output is cryptographically signed, sequenced, and written to an immutable audit trail before the user ever sees a response.

**No PHI ever leaves the facility. No query is ever unlogged. No log is ever alterable.**

---

## Repository Contents

```
sentinel_audit_wrapper.py        — Core audit wrapper (production-ready)
sentinel-node-audit-log-notes.md — Design decisions and architecture notes
.gitignore                       — Secrets and logs excluded (see Security below)
README.md                        — This file
```

---

## Architecture

```
User Query
    ↓
[AUDIT WRAPPER — QUERY_IN]     ← HMAC-signed, fsync'd to disk
    ↓
LLM via Ollama (local, air-gapped)
    ↓
[AUDIT WRAPPER — RESPONSE_OUT] ← HMAC-signed, fsync'd to disk
    ↓
User sees response
```

The wrapper is **model-agnostic**. It works identically with:
- `llama4` — general clinical and administrative use
- `mistral` — general legal use
- `biomistral` — specialized medical terminology
- Any model served by Ollama

Swap the model. The audit trail never changes structure.

---

## Audit Event Types

| Event | When Written | Key Fields |
|---|---|---|
| `QUERY_IN` | Before model sees the prompt | timestamp, hmac_query, context_chunk_ids, model |
| `RESPONSE_OUT` | After model responds, before user sees it | hmac_query (links to IN), hmac_response, latency_ms, chunks_cited |
| `QUERY_ERROR` | If model fails or times out | error_type, error_message, latency_ms |
| `QUERY_QUARANTINE` | If OCR confidence gate rejects a document | quarantine_reason |

Every `QUERY_IN` is linked to its matching `RESPONSE_OUT` via the `hmac_query` field. A complete interaction can always be reconstructed.

---

## Immutability Pipeline

The audit log uses a **write-then-immutabilize** pattern:

```bash
# Active log — always writable
/var/log/sentinel/audit.log

# On hourly rotation (via logrotate):
sha256sum /var/log/sentinel/audit.log.1 >> /var/log/sentinel/hash-chain.log
chattr +i /var/log/sentinel/audit.log.1    # Linux immutable bit
chattr +i /var/log/sentinel/hash-chain.log
```

Closed segments cannot be modified or deleted without:
1. Root access
2. Explicit `chattr -i` command
3. Both of which appear in the system audit trail

This satisfies HIPAA's audit control requirement under **45 CFR §164.312(b)**.

---

## Quick Start

### 1. Prerequisites

```bash
pip install requests python-dotenv

# Ollama must be running with your model pulled
ollama serve
ollama pull llama4     # or mistral, biomistral, etc.
```

### 2. Create log directory

```bash
sudo mkdir -p /var/log/sentinel
sudo chown $USER /var/log/sentinel
```

### 3. Generate your HMAC key

```bash
python3 sentinel_audit_wrapper.py --generate-key
```

This generates a 256-bit cryptographically secure key. **Copy it immediately.**

### 4. Create your `.env` file

```bash
cat > .env << EOF
SENTINEL_HMAC_KEY=<paste your generated key here>
SENTINEL_LOG_PATH=/var/log/sentinel/audit.log
SENTINEL_MODEL=llama4
SENTINEL_OLLAMA_URL=http://localhost:11434
SENTINEL_LLM_TIMEOUT=120
EOF
```

> ⚠️ **The `.env` file is in `.gitignore` and must never be committed.**
> Store it securely outside version control.

### 5. Run

```bash
python3 sentinel_audit_wrapper.py --user-id dr_smith
```

### 6. Watch the audit log in real time (second terminal)

```bash
tail -f /var/log/sentinel/audit.log | python3 -m json.tool
```

### 7. Verify a closed log segment

```bash
python3 sentinel_audit_wrapper.py --verify /var/log/sentinel/audit.log.1
# Exits 0 on clean, 1 on any integrity issue
```

---

## Running as a Daemon (systemd)

```ini
# /etc/systemd/system/sentinel-audit.service

[Unit]
Description=Sentinel Node Audit Wrapper — Pocono AI LLC
After=network.target ollama.service
Requires=ollama.service

[Service]
Type=simple
User=sentinel
Group=sentinel
WorkingDirectory=/opt/sentinel
EnvironmentFile=/opt/sentinel/.env
ExecStart=/usr/bin/python3 /opt/sentinel/sentinel_audit_wrapper.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sentinel-audit
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=/var/log/sentinel
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable sentinel-audit
sudo systemctl start sentinel-audit
sudo journalctl -u sentinel-audit -f
```

---

## Security

### What is and is not in this repository

| | In repo | Reason |
|---|---|---|
| `sentinel_audit_wrapper.py` | ✅ Yes | Source code — safe to version control |
| `sentinel-node-audit-log-notes.md` | ✅ Yes | Design notes — no secrets |
| `.gitignore` | ✅ Yes | Required |
| `.env` | ❌ Never | Contains HMAC key |
| `*.log` files | ❌ Never | Operational audit data |
| Model weights | ❌ Never | Multi-GB, managed by Ollama |

### HMAC Key Security

- The HMAC key is used to sign every audit record
- It **never appears in any log entry**
- It lives only in `.env` or your secrets manager
- If the key is compromised, generate a new one and rotate immediately
- Old log segments signed with the old key remain verifiable with the old key

### Verifying git history is clean

After your first push, confirm no secrets were accidentally committed:

```bash
# Should return nothing
git log --all --full-history -- .env
git log --all --full-history -- "*.log"

# Search all commits for the key pattern
git log -p | grep "SENTINEL_HMAC_KEY"
```

If any of these return results, treat the key as compromised and rotate it immediately.

---

## Compliance Alignment

| Requirement | How Sentinel Node™ Addresses It |
|---|---|
| HIPAA §164.312(b) — Audit Controls | Every query and response logged with HMAC signature and sequence number |
| HIPAA §164.312(a)(2)(i) — Unique User ID | `user_id` field on every audit record |
| HIPAA §164.312(b) — Log Integrity | `chattr +i` immutable bit + SHA-256 hash chain on rotation |
| NIST SP 800-53 AU-9 — Protection of Audit Info | Immutable bit prevents modification even by root without forensic trace |
| 45 CFR §164.312(e) — Transmission Security | PHI never transmitted — air-gapped hardware, no network path |

---

## Roadmap

- [ ] Qdrant RAG integration — replace stub with live vector retrieval
- [ ] FastAPI layer — HTTP API so AnythingLLM / LM Studio can call the wrapper
- [ ] `--tail` CLI flag — built-in pretty-print log watching
- [ ] LUKS encryption on log partition — second layer beyond HMAC integrity
- [ ] Retention policy configuration — client-configurable beyond 1-year default
- [ ] Twin Node log replication — passive node mirrors immutable segments

---

## About Pocono AI, LLC

Pocono AI builds hardware-custody-first AI infrastructure for high-liability medical and legal practices. The Sentinel Node™ is our flagship product — a locally-deployed, air-gapped inference system where your data never leaves your building, not by policy, but by architecture.

**Website:** [poconoai.com](https://poconoai.com)
**Founder:** Marcus O'Dell — [marcus@poconoai.com](mailto:marcus@poconoai.com)
**Text:** (570) 534-0602

---

*Sentinel Node™ and Enterprise Autonomy Architecture™ (EAA™) are trademarks of Pocono AI, LLC.*
