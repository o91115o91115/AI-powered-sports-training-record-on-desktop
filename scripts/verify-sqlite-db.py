from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "prisma" / "dev.db"

with sqlite3.connect(DB_PATH) as connection:
    tables = [
        row[0]
        for row in connection.execute(
            "select name from sqlite_master where type = 'table' order by name"
        )
    ]
    indexes = [
        row[0]
        for row in connection.execute(
            "select name from sqlite_master where type = 'index' and name not like 'sqlite_%' order by name"
        )
    ]

print("Tables:")
for table in tables:
    print(f"- {table}")

print("Indexes:")
for index in indexes:
    print(f"- {index}")
