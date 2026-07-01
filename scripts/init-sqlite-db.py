from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "prisma" / "dev.db"
SQL_PATH = ROOT / "prisma" / "migrations" / "202607011_create_initial_tables" / "migration.sql"

DB_PATH.parent.mkdir(parents=True, exist_ok=True)

with sqlite3.connect(DB_PATH) as connection:
    connection.execute("PRAGMA foreign_keys = ON;")
    connection.executescript(SQL_PATH.read_text(encoding="utf-8"))
    connection.commit()

print(f"Created SQLite database: {DB_PATH}")
