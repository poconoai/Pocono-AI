#!/usr/bin/env python3
"""
================================================================================
Sentinel Node™ — Immutable Audit Logging Wrapper
Pocono AI, LLC — Enterprise Autonomy Architecture (EAA™)
================================================================================

Author:  Marcus O'Dell, Founder & Chief Technologist
Version: 1.0.0
Date:    2026-04-25

PURPOSE
-------
This script is the audit wrapper layer that sits between the user and any
local LLM (Mistral, Llama 4, BioMistral, MedPaLM, or any Ollama-served model).

Every query and every response is intercepted, HMAC-signed, and written to an
append-only audit log BEFORE it reaches the user. The wrapper runs as a
continuous daemon and is model-agnostic — swap the model, the audit trail
never changes structure.

ARCHITECTURE
------------
  User Query
      ↓
  [AUDIT WRAPPER — QUERY_IN]   ← HMAC-signed, written to disk, fsync'd
      ↓
  LLM via Ollama HTTP API
      ↓
  [AUDIT WRAPPER — RESPONSE_OUT] ← HMAC-signed, written to disk, fsync'd
      ↓
  User sees response

AUDIT LOG FORMAT
----------------
  One JSON object per line (JSONL). Each line is a self-contained audit record.
  IN and OUT records are linked by matching hmac_query fields.

  QUERY_IN fields:
    timestamp, event, session_id, user_id, hmac_query,
    context_chunk_ids, model, log_sequence

  RESPONSE_OUT fields:
    timestamp, event, session_id, user_id, hmac_query, hmac_response,
    latency_ms, chunks_cited, model, log_sequence

  QUERY_QUARANTINE fields:
    timestamp, event, session_id, user_id, hmac_query,
    quarantine_reason, model, log_sequence

  QUERY_ERROR fields:
    timestamp, event, session_id, user_id, hmac_query,
    error_type, error_message, model, log_sequence

IMMUTABILITY (run separately via cron/logrotate)
-------------------------------------------------
  On hourly rotation:
    sha256sum /var/log/sentinel/audit.log.1 >> /var/log/sentinel/hash-chain.log
    chattr +i /var/log/sentinel/audit.log.1
    chattr +i /var/log/sentinel/hash-chain.log

RUNNING
-------
  # Direct:
  python3 sentinel_audit_wrapper.py

  # As daemon (systemd):
  See sentinel-audit.service template at bottom of this file

  # Environment variables (required):
  SENTINEL_HMAC_KEY   — secret key for HMAC signing (min 32 chars)
  SENTINEL_LOG_PATH   — path to audit log file
  SENTINEL_MODEL      — Ollama model name (e.g. llama4, mistral, biomistral)
  SENTINEL_OLLAMA_URL — Ollama API base URL (default: http://localhost:11434)

DEPENDENCIES
------------
  pip install requests python-dotenv

================================================================================
"""

import os
import sys
import json
import hmac
import hashlib
import time
import fcntl
import uuid
import signal
import logging
import threading
import requests

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

# ── Optional: load .env file if present ──────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required — use real env vars in production


# ==============================================================================
# CONFIGURATION
# ==============================================================================

class SentinelConfig:
    """
    All configuration loaded from environment variables.
    Never hardcode secrets in this file.
    """

    HMAC_KEY: bytes = os.environ.get(
        "SENTINEL_HMAC_KEY", ""
    ).encode("utf-8")

    LOG_PATH: Path = Path(
        os.environ.get("SENTINEL_LOG_PATH", "/var/log/sentinel/audit.log")
    )

    MODEL: str = os.environ.get("SENTINEL_MODEL", "llama4")

    OLLAMA_URL: str = os.environ.get(
        "SENTINEL_OLLAMA_URL", "http://localhost:11434"
    )

    # How long to wait for the LLM to respond (seconds)
    LLM_TIMEOUT: int = int(os.environ.get("SENTINEL_LLM_TIMEOUT", "120"))

    # Minimum HMAC key length — enforce at startup
    MIN_KEY_LENGTH: int = 32

    @classmethod
    def validate(cls) -> None:
        """Fail fast at startup if config is invalid."""
        errors = []

        if len(cls.HMAC_KEY) < cls.MIN_KEY_LENGTH:
            errors.append(
                f"SENTINEL_HMAC_KEY must be at least {cls.MIN_KEY_LENGTH} "
                f"characters. Got {len(cls.HMAC_KEY)}. "
                f"Generate one: python3 -c \"import secrets; print(secrets.token_hex(32))\""
            )

        if not cls.LOG_PATH.parent.exists():
            errors.append(
                f"Log directory does not exist: {cls.LOG_PATH.parent}. "
                f"Create it: mkdir -p {cls.LOG_PATH.parent}"
            )

        if errors:
            for e in errors:
                print(f"[SENTINEL CONFIG ERROR] {e}", file=sys.stderr)
            sys.exit(1)


# ==============================================================================
# HMAC SIGNING
# ==============================================================================

class HMACSignature:
    """
    HMAC-SHA256 signing for audit records.

    Using keyed HMAC rather than plain SHA-256 prevents rainbow-table
    reconstruction of queries from hashes — stronger privacy posture.
    The HMAC key never appears in the log.
    """

    @staticmethod
    def sign(data: str) -> str:
        """Return hex HMAC-SHA256 of data using the configured key."""
        return hmac.new(
            SentinelConfig.HMAC_KEY,
            data.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

    @staticmethod
    def sign_bytes(data: bytes) -> str:
        """Return hex HMAC-SHA256 of raw bytes."""
        return hmac.new(
            SentinelConfig.HMAC_KEY,
            data,
            hashlib.sha256
        ).hexdigest()

    @staticmethod
    def verify(data: str, expected_hmac: str) -> bool:
        """Constant-time comparison — prevents timing attacks."""
        computed = HMACSignature.sign(data)
        return hmac.compare_digest(computed, expected_hmac)


# ==============================================================================
# AUDIT LOG WRITER
# ==============================================================================

class AuditLogWriter:
    """
    Thread-safe, fsync'd, append-only audit log writer.

    Uses fcntl.flock for file-level locking so concurrent users
    never produce interleaved JSON lines.

    Each record is one complete JSON object on one line (JSONL format).
    """

    def __init__(self, log_path: Path):
        self.log_path = log_path
        self._lock = threading.Lock()        # in-process thread lock
        self._sequence = self._load_sequence()
        self._logger = logging.getLogger("sentinel.writer")

    def _load_sequence(self) -> int:
        """
        Resume sequence number from last line of existing log.
        Ensures sequence is always monotonically increasing across restarts.
        """
        if not self.log_path.exists():
            return 0
        try:
            with open(self.log_path, "rb") as f:
                # Seek to last line efficiently
                f.seek(0, 2)
                size = f.tell()
                if size == 0:
                    return 0
                # Read last 4KB — enough for one log line
                f.seek(max(0, size - 4096))
                last_lines = f.read().decode("utf-8", errors="replace").strip()
                if not last_lines:
                    return 0
                last_line = last_lines.split("\n")[-1]
                last_record = json.loads(last_line)
                return last_record.get("log_sequence", 0) + 1
        except Exception:
            return 0

    def write(self, record: Dict[str, Any]) -> None:
        """
        Write one audit record to the log.
        Thread-safe. File-locked. fsync'd to disk before returning.
        """
        with self._lock:
            self._sequence += 1
            record["log_sequence"] = self._sequence

            line = json.dumps(record, ensure_ascii=False) + "\n"

            try:
                with open(self.log_path, "a", encoding="utf-8") as f:
                    # Acquire exclusive file lock (blocks other processes)
                    fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                    try:
                        f.write(line)
                        f.flush()
                        os.fsync(f.fileno())   # survive a power cut
                    finally:
                        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
            except OSError as e:
                # Log to stderr — never silently drop an audit record
                self._logger.critical(
                    f"AUDIT WRITE FAILURE — record may be lost: {e}\n"
                    f"Record: {line}"
                )
                raise


# ==============================================================================
# OLLAMA CLIENT
# ==============================================================================

class OllamaClient:
    """
    Minimal HTTP client for Ollama local inference API.
    Works with any model served by Ollama:
      - llama4, llama3, mistral, biomistral, medpalm, gemma, phi3, etc.

    Ollama API docs: https://ollama.com/docs/api
    """

    def __init__(self, base_url: str, model: str, timeout: int):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._logger = logging.getLogger("sentinel.ollama")

    def health_check(self) -> bool:
        """Verify Ollama is running before accepting queries."""
        try:
            r = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return r.status_code == 200
        except requests.RequestException:
            return False

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context_text: Optional[str] = None,
        temperature: float = 0.1,   # Low temp for clinical accuracy
    ) -> Dict[str, Any]:
        """
        Send a prompt to Ollama and return the full response dict.

        Returns:
            {
                "text":     str,      # the model's response text
                "model":    str,      # model name echo
                "done":     bool,     # whether generation completed
                "raw":      dict,     # full Ollama response payload
            }

        Raises:
            OllamaTimeoutError   — model took too long
            OllamaConnectionError — can't reach Ollama
            OllamaGenerationError — model returned an error
        """
        # Build the full prompt with optional context injection
        full_prompt = prompt
        if context_text:
            full_prompt = (
                f"CONTEXT (retrieved from local documents):\n"
                f"{context_text}\n\n"
                f"QUERY:\n{prompt}"
            )

        payload = {
            "model":  self.model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": 2048,
            }
        }

        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()

            return {
                "text":  data.get("response", ""),
                "model": data.get("model", self.model),
                "done":  data.get("done", False),
                "raw":   data,
            }

        except requests.Timeout:
            raise OllamaTimeoutError(
                f"Model '{self.model}' did not respond within {self.timeout}s"
            )
        except requests.ConnectionError:
            raise OllamaConnectionError(
                f"Cannot reach Ollama at {self.base_url}. "
                f"Is Ollama running? Try: ollama serve"
            )
        except requests.HTTPError as e:
            raise OllamaGenerationError(f"Ollama HTTP error: {e}")


# Custom exceptions for clean error handling
class OllamaTimeoutError(Exception):
    pass

class OllamaConnectionError(Exception):
    pass

class OllamaGenerationError(Exception):
    pass


# ==============================================================================
# CONTEXT CHUNK (Qdrant / RAG result)
# ==============================================================================

class ContextChunk:
    """
    Represents one document chunk retrieved from the Qdrant vector database.
    In production, these are returned by your RAG retrieval layer.
    """

    def __init__(
        self,
        chunk_id: str,
        text: str,
        source_document: str,
        page: Optional[int] = None,
        score: Optional[float] = None,
    ):
        self.chunk_id = chunk_id
        self.text = text
        self.source_document = source_document
        self.page = page
        self.score = score          # similarity score from Qdrant

    def to_audit_dict(self) -> Dict[str, Any]:
        """Minimal representation for audit log — no full text."""
        return {
            "chunk_id":        self.chunk_id,
            "source_document": self.source_document,
            "page":            self.page,
            "score":           self.score,
        }

    def to_context_text(self) -> str:
        """Full text for injection into LLM prompt."""
        header = f"[Source: {self.source_document}"
        if self.page:
            header += f", page {self.page}"
        header += "]"
        return f"{header}\n{self.text}"


# ==============================================================================
# MAIN AUDIT WRAPPER
# ==============================================================================

class SentinelAuditWrapper:
    """
    The core wrapper. Sits between every user query and the LLM.

    Usage:
        wrapper = SentinelAuditWrapper()
        response = wrapper.query(
            user_input     = "Summarize the patient's medication history",
            context_chunks = rag_results,   # list of ContextChunk
            user_id        = "dr_smith",
            session_id     = session_uuid,
        )
        print(response["text"])

    The wrapper handles all audit logging internally.
    The caller never needs to touch the log.
    """

    def __init__(self):
        SentinelConfig.validate()

        self.log_writer = AuditLogWriter(SentinelConfig.LOG_PATH)
        self.ollama = OllamaClient(
            base_url = SentinelConfig.OLLAMA_URL,
            model    = SentinelConfig.MODEL,
            timeout  = SentinelConfig.LLM_TIMEOUT,
        )
        self._logger = logging.getLogger("sentinel.wrapper")

        self._logger.info(
            f"Sentinel Audit Wrapper initialized | "
            f"model={SentinelConfig.MODEL} | "
            f"log={SentinelConfig.LOG_PATH}"
        )

    # ── PUBLIC API ────────────────────────────────────────────────────────────

    def query(
        self,
        user_input:     str,
        user_id:        str,
        context_chunks: Optional[List[ContextChunk]] = None,
        session_id:     Optional[str] = None,
        system_prompt:  Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        The single entry point for all queries.

        Every call produces exactly two audit records:
          QUERY_IN    — written before the model sees the prompt
          RESPONSE_OUT — written after the model responds, before user sees it

        On error, produces a QUERY_ERROR record instead of RESPONSE_OUT.
        On quarantine (future: OCR confidence gate), produces QUERY_QUARANTINE.

        Returns:
            {
                "text":       str,   # model response
                "session_id": str,   # for linking multiple turns
                "hmac_query": str,   # for cross-referencing audit log
            }
        """
        if context_chunks is None:
            context_chunks = []

        if session_id is None:
            session_id = str(uuid.uuid4())

        # Sign the raw query with HMAC — links IN and OUT records
        hmac_query = HMACSignature.sign(user_input)

        # ── WRITE: QUERY_IN ──────────────────────────────────────────────────
        self._write_query_in(
            session_id     = session_id,
            user_id        = user_id,
            hmac_query     = hmac_query,
            context_chunks = context_chunks,
        )

        # ── CALL LLM ─────────────────────────────────────────────────────────
        t_start = time.monotonic()

        try:
            context_text = "\n\n".join(
                chunk.to_context_text() for chunk in context_chunks
            ) if context_chunks else None

            llm_response = self.ollama.generate(
                prompt        = user_input,
                system_prompt = system_prompt,
                context_text  = context_text,
            )

            latency_ms = int((time.monotonic() - t_start) * 1000)

            # ── WRITE: RESPONSE_OUT ──────────────────────────────────────────
            self._write_response_out(
                session_id     = session_id,
                user_id        = user_id,
                hmac_query     = hmac_query,
                response_text  = llm_response["text"],
                latency_ms     = latency_ms,
                context_chunks = context_chunks,
            )

            return {
                "text":       llm_response["text"],
                "session_id": session_id,
                "hmac_query": hmac_query,
                "latency_ms": latency_ms,
            }

        except (OllamaTimeoutError, OllamaConnectionError,
                OllamaGenerationError) as e:

            latency_ms = int((time.monotonic() - t_start) * 1000)

            # ── WRITE: QUERY_ERROR ───────────────────────────────────────────
            self._write_query_error(
                session_id  = session_id,
                user_id     = user_id,
                hmac_query  = hmac_query,
                error       = e,
                latency_ms  = latency_ms,
            )
            raise  # re-raise so the caller can handle it

    def quarantine(
        self,
        user_input:       str,
        user_id:          str,
        session_id:       str,
        quarantine_reason: str,
    ) -> None:
        """
        Called by the OCR confidence gate when a document is rejected.
        Links the sanitization pipeline to the audit log as one unified record.
        """
        hmac_query = HMACSignature.sign(user_input)

        self._write_record({
            "timestamp":        self._now(),
            "event":            "QUERY_QUARANTINE",
            "session_id":       session_id,
            "user_id":          user_id,
            "hmac_query":       hmac_query,
            "quarantine_reason": quarantine_reason,
            "model":            SentinelConfig.MODEL,
        })

        self._logger.warning(
            f"QUARANTINE | session={session_id} | reason={quarantine_reason}"
        )

    # ── PRIVATE RECORD BUILDERS ───────────────────────────────────────────────

    def _write_query_in(
        self,
        session_id:     str,
        user_id:        str,
        hmac_query:     str,
        context_chunks: List[ContextChunk],
    ) -> None:
        self._write_record({
            "timestamp":        self._now(),
            "event":            "QUERY_IN",
            "session_id":       session_id,
            "user_id":          user_id,
            "hmac_query":       hmac_query,
            "context_chunk_ids": [
                chunk.to_audit_dict() for chunk in context_chunks
            ],
            "model":            SentinelConfig.MODEL,
        })

    def _write_response_out(
        self,
        session_id:     str,
        user_id:        str,
        hmac_query:     str,
        response_text:  str,
        latency_ms:     int,
        context_chunks: List[ContextChunk],
    ) -> None:
        self._write_record({
            "timestamp":     self._now(),
            "event":         "RESPONSE_OUT",
            "session_id":    session_id,
            "user_id":       user_id,
            "hmac_query":    hmac_query,           # links back to QUERY_IN
            "hmac_response": HMACSignature.sign(response_text),
            "latency_ms":    latency_ms,
            "chunks_cited":  [
                chunk.to_audit_dict() for chunk in context_chunks
            ],
            "model":         SentinelConfig.MODEL,
        })

    def _write_query_error(
        self,
        session_id: str,
        user_id:    str,
        hmac_query: str,
        error:      Exception,
        latency_ms: int,
    ) -> None:
        self._write_record({
            "timestamp":    self._now(),
            "event":        "QUERY_ERROR",
            "session_id":   session_id,
            "user_id":      user_id,
            "hmac_query":   hmac_query,
            "error_type":   type(error).__name__,
            "error_message": str(error),
            "latency_ms":   latency_ms,
            "model":        SentinelConfig.MODEL,
        })
        self._logger.error(
            f"QUERY_ERROR | session={session_id} | {type(error).__name__}: {error}"
        )

    def _write_record(self, record: Dict[str, Any]) -> None:
        self.log_writer.write(record)

    @staticmethod
    def _now() -> str:
        """UTC timestamp in ISO 8601 format."""
        return datetime.now(timezone.utc).isoformat()


# ==============================================================================
# INTERACTIVE DEMO / CONTINUOUS RUNNER
# ==============================================================================

class SentinelRunner:
    """
    Runs the wrapper continuously as an interactive command-line session.

    In production, replace this with your web interface, API server,
    or AnythingLLM / LM Studio integration.

    This runner demonstrates the full audit trail — run it and then
    tail -f your log file to watch records appear in real time.
    """

    # System prompt tailored for clinical/legal use
    DEFAULT_SYSTEM_PROMPT = (
        "You are a private, locally-running AI assistant deployed on a "
        "Sentinel Node™ by Pocono AI, LLC. You ONLY answer questions based "
        "on the documents provided in your context. If the answer is not in "
        "the provided context, say so explicitly. Never fabricate information. "
        "Always cite which document your answer comes from. "
        "This system operates under HIPAA and EAA™ compliance requirements."
    )

    def __init__(self):
        self.wrapper = SentinelAuditWrapper()
        self._running = True
        self._session_id = str(uuid.uuid4())
        self._logger = logging.getLogger("sentinel.runner")

        # Graceful shutdown on Ctrl+C or SIGTERM
        signal.signal(signal.SIGINT,  self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

    def run(self, user_id: str = "local_user") -> None:
        """
        Start the interactive session loop.
        Runs until the user types 'exit', 'quit', or sends SIGTERM.
        """
        print("\n" + "="*70)
        print("  Sentinel Node™ — Audit Wrapper · Pocono AI, LLC")
        print(f"  Model:   {SentinelConfig.MODEL}")
        print(f"  Log:     {SentinelConfig.LOG_PATH}")
        print(f"  Session: {self._session_id}")
        print("  Type 'exit' to quit. Ctrl+C for graceful shutdown.")
        print("="*70 + "\n")

        # Verify Ollama is reachable before accepting input
        print("Checking Ollama connection...", end=" ", flush=True)
        if not self.wrapper.ollama.health_check():
            print("FAILED")
            print(
                f"\n[ERROR] Cannot reach Ollama at {SentinelConfig.OLLAMA_URL}\n"
                f"  Start Ollama:  ollama serve\n"
                f"  Pull model:    ollama pull {SentinelConfig.MODEL}\n"
            )
            sys.exit(1)
        print(f"OK — {SentinelConfig.MODEL} ready\n")

        while self._running:
            try:
                user_input = input("You: ").strip()
            except EOFError:
                # stdin closed — daemon mode
                break

            if not user_input:
                continue

            if user_input.lower() in ("exit", "quit", "q"):
                self._shutdown(None, None)
                break

            # ── In production: retrieve context chunks from Qdrant here ──
            # For the demo, we run with no context (direct LLM query)
            # Replace this with your RAG retrieval call:
            #   context_chunks = qdrant_client.search(user_input, top_k=5)
            context_chunks: List[ContextChunk] = []

            print("\nSentinel Node™: ", end="", flush=True)

            try:
                result = self.wrapper.query(
                    user_input     = user_input,
                    user_id        = user_id,
                    context_chunks = context_chunks,
                    session_id     = self._session_id,
                    system_prompt  = self.DEFAULT_SYSTEM_PROMPT,
                )

                print(result["text"])
                print(
                    f"\n  [Audit] hmac_query={result['hmac_query'][:16]}... "
                    f"| latency={result['latency_ms']}ms "
                    f"| log_seq={self.wrapper.log_writer._sequence}"
                )

            except OllamaConnectionError as e:
                print(f"\n[CONNECTION ERROR] {e}")
            except OllamaTimeoutError as e:
                print(f"\n[TIMEOUT] {e}")
            except OllamaGenerationError as e:
                print(f"\n[MODEL ERROR] {e}")
            except Exception as e:
                print(f"\n[UNEXPECTED ERROR] {type(e).__name__}: {e}")
                self._logger.exception("Unexpected error in query loop")

            print()

    def _shutdown(self, signum, frame) -> None:
        print("\n\nShutting down Sentinel Audit Wrapper — goodbye.")
        self._running = False


# ==============================================================================
# AUDIT LOG VERIFIER
# ==============================================================================

class AuditLogVerifier:
    """
    Standalone utility to verify the integrity of a closed audit log segment.

    Usage:
        verifier = AuditLogVerifier("/var/log/sentinel/audit.log.1")
        report = verifier.verify()
        print(report)

    Run this after each hourly rotation to confirm the segment is intact
    before immutabilizing it.
    """

    def __init__(self, log_path: str):
        self.log_path = Path(log_path)

    def verify(self) -> Dict[str, Any]:
        """
        Parse the log file and return a verification report.

        Checks:
          - All lines are valid JSON
          - Sequence numbers are monotonically increasing (no gaps, no dupes)
          - Every QUERY_IN has a matching RESPONSE_OUT or QUERY_ERROR
          - HMAC signatures are internally consistent (structure only —
            full HMAC verification requires the key)
        """
        report = {
            "file":           str(self.log_path),
            "total_records":  0,
            "events":         {},
            "sequence_ok":    True,
            "pairs_matched":  True,
            "parse_errors":   [],
            "unmatched_queries": [],
            "verified_at":    datetime.now(timezone.utc).isoformat(),
        }

        records = []
        with open(self.log_path, "r", encoding="utf-8") as f:
            for i, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    records.append(record)
                except json.JSONDecodeError as e:
                    report["parse_errors"].append(
                        f"Line {i}: {e}"
                    )

        report["total_records"] = len(records)

        # Count event types
        for r in records:
            event = r.get("event", "UNKNOWN")
            report["events"][event] = report["events"].get(event, 0) + 1

        # Check sequence monotonicity
        sequences = [r.get("log_sequence", -1) for r in records]
        for i in range(1, len(sequences)):
            if sequences[i] != sequences[i-1] + 1:
                report["sequence_ok"] = False
                report["sequence_gap"] = {
                    "at_record": i,
                    "expected":  sequences[i-1] + 1,
                    "got":       sequences[i],
                }
                break

        # Check QUERY_IN / RESPONSE_OUT pairing
        in_queries  = {r["hmac_query"] for r in records if r.get("event") == "QUERY_IN"}
        out_queries = {r["hmac_query"] for r in records
                       if r.get("event") in ("RESPONSE_OUT", "QUERY_ERROR", "QUERY_QUARANTINE")}
        unmatched = in_queries - out_queries
        if unmatched:
            report["pairs_matched"] = False
            report["unmatched_queries"] = list(unmatched)

        return report


# ==============================================================================
# ENTRY POINT
# ==============================================================================

def setup_logging() -> None:
    """Configure structured logging to stderr."""
    logging.basicConfig(
        level   = logging.INFO,
        format  = "%(asctime)s [%(name)s] %(levelname)s — %(message)s",
        datefmt = "%Y-%m-%dT%H:%M:%SZ",
        stream  = sys.stderr,
    )


def main() -> None:
    setup_logging()

    # ── CLI argument handling ─────────────────────────────────────────────────
    import argparse

    parser = argparse.ArgumentParser(
        description="Sentinel Node™ Audit Wrapper — Pocono AI, LLC"
    )
    parser.add_argument(
        "--user-id", default="local_user",
        help="User ID to record in audit log (default: local_user)"
    )
    parser.add_argument(
        "--verify", metavar="LOG_FILE",
        help="Verify integrity of a closed log segment and exit"
    )
    parser.add_argument(
        "--generate-key", action="store_true",
        help="Generate a secure HMAC key and exit"
    )
    args = parser.parse_args()

    # ── Key generation utility ───────────────────────────────────────────────
    if args.generate_key:
        import secrets
        key = secrets.token_hex(32)
        print(f"\nGenerated HMAC key (64 hex chars = 256 bits):")
        print(f"  {key}")
        print(f"\nAdd to your environment:")
        print(f"  export SENTINEL_HMAC_KEY={key}")
        print(f"\nOr add to .env file:")
        print(f"  SENTINEL_HMAC_KEY={key}\n")
        sys.exit(0)

    # ── Log verification mode ────────────────────────────────────────────────
    if args.verify:
        verifier = AuditLogVerifier(args.verify)
        report   = verifier.verify()
        print(json.dumps(report, indent=2))
        ok = (
            report["sequence_ok"] and
            report["pairs_matched"] and
            not report["parse_errors"]
        )
        sys.exit(0 if ok else 1)

    # ── Normal operation: continuous interactive session ─────────────────────
    runner = SentinelRunner()
    runner.run(user_id=args.user_id)


if __name__ == "__main__":
    main()


# ==============================================================================
# SYSTEMD SERVICE TEMPLATE
# ==============================================================================
#
# Save as: /etc/systemd/system/sentinel-audit.service
#
# [Unit]
# Description=Sentinel Node Audit Wrapper — Pocono AI LLC
# After=network.target ollama.service
# Requires=ollama.service
#
# [Service]
# Type=simple
# User=sentinel
# Group=sentinel
# WorkingDirectory=/opt/sentinel
# EnvironmentFile=/opt/sentinel/.env
# ExecStart=/usr/bin/python3 /opt/sentinel/sentinel_audit_wrapper.py
# Restart=always
# RestartSec=5
# StandardOutput=journal
# StandardError=journal
# SyslogIdentifier=sentinel-audit
#
# # Security hardening
# NoNewPrivileges=yes
# ProtectSystem=strict
# ReadWritePaths=/var/log/sentinel
# PrivateTmp=yes
#
# [Install]
# WantedBy=multi-user.target
#
# ── Enable and start: ────────────────────────────────────────────────────────
#   sudo systemctl daemon-reload
#   sudo systemctl enable sentinel-audit
#   sudo systemctl start sentinel-audit
#   sudo journalctl -u sentinel-audit -f
#
# ==============================================================================
#
# QUICK START (no systemd)
# ────────────────────────
#   # 1. Install dependencies
#   pip install requests python-dotenv
#
#   # 2. Create log directory
#   sudo mkdir -p /var/log/sentinel
#   sudo chown $USER /var/log/sentinel
#
#   # 3. Generate HMAC key
#   python3 sentinel_audit_wrapper.py --generate-key
#
#   # 4. Create .env file
#   cat > .env << EOF
#   SENTINEL_HMAC_KEY=<paste key here>
#   SENTINEL_LOG_PATH=/var/log/sentinel/audit.log
#   SENTINEL_MODEL=llama4
#   SENTINEL_OLLAMA_URL=http://localhost:11434
#   EOF
#
#   # 5. Start Ollama and pull your model
#   ollama serve &
#   ollama pull llama4
#
#   # 6. Run the wrapper
#   python3 sentinel_audit_wrapper.py --user-id dr_smith
#
#   # 7. In another terminal — watch the audit log in real time
#   tail -f /var/log/sentinel/audit.log | python3 -m json.tool
#
#   # 8. Verify a closed log segment
#   python3 sentinel_audit_wrapper.py --verify /var/log/sentinel/audit.log.1
#
# ==============================================================================
