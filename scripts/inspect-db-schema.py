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

    for table in tables:
        columns = [
            f"{row[1]}:{row[2]}{' NOT NULL' if row[3] else ''}"
            for row in connection.execute(f'pragma table_info("{table}")')
        ]
        foreign_keys = [
            f"{row[3]} -> {row[2]}.{row[4]}"
            for row in connection.execute(f'pragma foreign_key_list("{table}")')
        ]

        print(f"{table}")
        print(f"  columns: {len(columns)}")
        print(f"  {', '.join(columns)}")
        if foreign_keys:
            print(f"  foreign keys: {', '.join(foreign_keys)}")
