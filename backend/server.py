"""Small public sorting register for the Gazette d'Abel."""

from __future__ import annotations

import html
import json
import os
import re
import sqlite3
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


HERE = Path(__file__).resolve().parent
PEOPLE = json.loads((HERE / "people.json").read_text(encoding="utf-8"))
HOUSES = {"gryffindor", "hufflepuff", "ravenclaw", "slytherin"}
TRAITS = {
    "courage", "initiative", "integrity", "resilience", "loyalty", "empathy",
    "patience", "fairness", "curiosity", "analysis", "creativity",
    "independence", "ambition", "strategy", "determination", "resourcefulness",
}
DB_PATH = Path(os.environ.get("GAZETTE_DB_PATH", "/data/assignments.sqlite3"))
PORT = int(os.environ.get("GAZETTE_PORT", "8000"))
ALLOWED_ORIGINS = {
    origin.strip().rstrip("/")
    for origin in os.environ.get("GAZETTE_ALLOWED_ORIGINS", "https://yohikofox.github.io").split(",")
    if origin.strip()
}
WRITE_LOCK = threading.Lock()
PERSON_PATH = re.compile(r"^/v1/assignments/([a-z0-9_]+)$")


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout=10000")
    return db


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS assignments (
                person_id TEXT PRIMARY KEY,
                result_json TEXT NOT NULL,
                revision INTEGER NOT NULL,
                mutation_id TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS conflicts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person_id TEXT NOT NULL,
                candidate_json TEXT NOT NULL,
                shared_json TEXT NOT NULL,
                mutation_id TEXT NOT NULL UNIQUE,
                device_id TEXT,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'open'
            );
            CREATE TABLE IF NOT EXISTS meta (
                name TEXT PRIMARY KEY,
                value INTEGER NOT NULL
            );
            INSERT OR IGNORE INTO meta(name,value) VALUES ('revision',0);
        """)


def valid_result(value: object) -> bool:
    if not isinstance(value, dict) or value.get("house") not in HOUSES:
        return False
    answers = value.get("answers")
    ids = value.get("questionIds")
    traits = value.get("traits")
    reasons = value.get("reasons")
    return (
        isinstance(answers, list) and 3 <= len(answers) <= 4
        and all(type(answer) is int and 0 <= answer <= 3 for answer in answers)
        and isinstance(ids, list) and len(ids) == len(answers)
        and len(set(ids)) == len(ids)
        and all(isinstance(item, str) and 1 <= len(item) <= 80 for item in ids)
        and isinstance(traits, dict) and set(traits) <= TRAITS
        and all(type(score) is int and 0 <= score <= 12 for score in traits.values())
        and isinstance(reasons, list) and 0 <= len(reasons) <= 3
        and all(reason in TRAITS for reason in reasons)
        and value.get("questions") == len(answers)
        and type(value.get("score")) is int and 0 <= value["score"] <= 200
    )


def assignment(row: sqlite3.Row) -> dict:
    return {
        "result": json.loads(row["result_json"]),
        "revision": row["revision"],
        "updatedAt": row["updated_at"],
    }


def snapshot() -> dict:
    with connect() as db:
        revision = db.execute("SELECT value FROM meta WHERE name='revision'").fetchone()[0]
        rows = db.execute("SELECT * FROM assignments ORDER BY person_id").fetchall()
    return {"revision": revision, "assignments": {row["person_id"]: assignment(row) for row in rows}}


def save_result(person_id: str, payload: dict) -> tuple[int, dict]:
    result = payload["result"]
    mutation_id = payload["mutationId"]
    base_revision = payload.get("baseRevision")
    device_id = payload.get("deviceId", "")
    with WRITE_LOCK, connect() as db:
        db.execute("BEGIN IMMEDIATE")
        current = db.execute("SELECT * FROM assignments WHERE person_id=?", (person_id,)).fetchone()
        if current and current["mutation_id"] == mutation_id:
            return 200, {"assignment": assignment(current), "conflictRecorded": False}
        if current and base_revision != current["revision"]:
            shared = assignment(current)
            if result == shared["result"]:
                return 200, {"assignment": shared, "conflictRecorded": False}
            db.execute(
                "INSERT OR IGNORE INTO conflicts(person_id,candidate_json,shared_json,mutation_id,device_id,created_at) VALUES (?,?,?,?,?,?)",
                (person_id, json.dumps(result, separators=(",", ":")), current["result_json"], mutation_id, device_id, now()),
            )
            return 200, {"assignment": shared, "conflictRecorded": True}
        if not current and base_revision is not None:
            return 409, {"error": "unknown_base_revision"}
        row_revision = (current["revision"] + 1) if current else 1
        timestamp = now()
        db.execute(
            "INSERT INTO assignments(person_id,result_json,revision,mutation_id,updated_at) VALUES (?,?,?,?,?) "
            "ON CONFLICT(person_id) DO UPDATE SET result_json=excluded.result_json,revision=excluded.revision,mutation_id=excluded.mutation_id,updated_at=excluded.updated_at",
            (person_id, json.dumps(result, separators=(",", ":")), row_revision, mutation_id, timestamp),
        )
        db.execute("UPDATE meta SET value=value+1 WHERE name='revision'")
        return 200, {"assignment": {"result": result, "revision": row_revision, "updatedAt": timestamp}, "conflictRecorded": False}


def conflict_page() -> str:
    with connect() as db:
        rows = db.execute("SELECT id,person_id,candidate_json,shared_json,device_id,created_at,status FROM conflicts ORDER BY id DESC LIMIT 200").fetchall()
    items = []
    for row in rows:
        candidate = json.loads(row["candidate_json"])["house"]
        shared = json.loads(row["shared_json"])["house"]
        items.append(
            f"<tr><td>{row['id']}</td><td>{html.escape(PEOPLE[row['person_id']])}</td>"
            f"<td>{html.escape(shared)}</td><td>{html.escape(candidate)}</td>"
            f"<td>{html.escape(row['created_at'])}</td><td>{html.escape(row['status'])}</td></tr>"
        )
    return """<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gazette d'Abel · suivi des conflits</title><style>body{font:18px/1.4 Georgia,serif;max-width:1100px;margin:30px auto;padding:0 16px;background:#ead9b5;color:#211b15}table{border-collapse:collapse;width:100%}td,th{padding:8px;border:1px solid #766044;text-align:left}th{background:#d5bd91}tr:nth-child(even){background:#f4e6c9}</style>
<h1>Résultats à rapprocher</h1><p>Cette page de suivi fait partie de la même stack que l'API. Elle n'apparaît pas dans l'interface familiale.</p>
<table><thead><tr><th>N°</th><th>Personne</th><th>Résultat commun</th><th>Résultat conservé sur le téléphone</th><th>Reçu le</th><th>État</th></tr></thead><tbody>""" + "".join(items) + "</tbody></table></html>"


class Handler(BaseHTTPRequestHandler):
    server_version = "GazetteRegister/1"

    def common_headers(self, content_type: str, length: int) -> None:
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def respond(self, status: int, value: object, content_type: str = "application/json; charset=utf-8") -> None:
        body = value.encode("utf-8") if isinstance(value, str) else json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.common_headers(content_type, len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        if self.headers.get("Origin", "") not in ALLOWED_ORIGINS:
            self.respond(403, {"error": "origin_not_allowed"})
            return
        self.send_response(204)
        self.common_headers("text/plain", 0)
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/health":
            self.respond(200, {"ok": True})
        elif path == "/v1/assignments":
            self.respond(200, snapshot())
        elif path == "/admin/conflicts":
            self.respond(200, conflict_page(), "text/html; charset=utf-8")
        else:
            self.respond(404, {"error": "not_found"})

    def do_PUT(self) -> None:
        match = PERSON_PATH.fullmatch(urlsplit(self.path).path)
        if not match or match.group(1) not in PEOPLE:
            self.respond(404, {"error": "person_not_found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= 12000:
            self.respond(413, {"error": "invalid_body_size"})
            return
        try:
            payload = json.loads(self.rfile.read(length))
        except (ValueError, UnicodeDecodeError):
            self.respond(400, {"error": "invalid_json"})
            return
        if not isinstance(payload, dict) or not valid_result(payload.get("result")):
            self.respond(422, {"error": "invalid_result"})
            return
        mutation_id = payload.get("mutationId")
        base_revision = payload.get("baseRevision")
        device_id = payload.get("deviceId", "")
        if not isinstance(mutation_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,80}", mutation_id):
            self.respond(422, {"error": "invalid_mutation_id"})
            return
        if base_revision is not None and (type(base_revision) is not int or base_revision < 1):
            self.respond(422, {"error": "invalid_base_revision"})
            return
        if not isinstance(device_id, str) or len(device_id) > 80:
            self.respond(422, {"error": "invalid_device_id"})
            return
        status, result = save_result(match.group(1), payload)
        self.respond(status, result)


if __name__ == "__main__":
    init_db()
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
