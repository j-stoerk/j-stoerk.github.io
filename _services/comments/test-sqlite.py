"""Small real-SQLite adapter for D1 contract tests; never used by the Worker."""
import json
import sqlite3
import sys

payload = json.load(sys.stdin)
with sqlite3.connect(sys.argv[1]) as db:
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    if "schema" in payload:
        db.executescript(payload["schema"])
        result = []
    else:
        result = []
        for statement in payload["statements"]:
            cursor = db.execute(statement["sql"], statement["params"])
            rows = [dict(row) for row in cursor.fetchall()] if cursor.description else []
            result.append({"success": True, "results": rows})
print(json.dumps(result))
