import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ.get("POSTGRES_URL")

migration_file = "migrations/024_create_lead_proposals.sql"
with open(migration_file, "r") as f:
    sql = f.read()

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

print("Executing migration 024...")
cur.execute(sql)
print("Success!")
cur.close()
conn.close()
