#!/usr/bin/env python
import pathlib, re, sys

root = pathlib.Path(__file__).parent
schema_file = root / 'database' / 'schema-postgres.sql'
migs_dir = root / 'database' / 'migrations'

# Extract tables from SQL schema
schema_text = schema_file.read_text(encoding='utf-8', errors='ignore')
schema_tables = set(re.findall(r'CREATE TABLE public\.([a-zA-Z0-9_]+)', schema_text))

# Extract tables created in migrations
mig_tables = set()
for mig in migs_dir.glob('*.php'):
    mig_text = mig.read_text(encoding='utf-8', errors='ignore')
    matches = re.findall(r"Schema::create\('([a-z0-9_]+)'", mig_text)
    mig_tables.update(matches)

print(f"Schema tables: {len(schema_tables)}")
print(f"Migration create tables: {len(mig_tables)}")

missing = sorted(schema_tables - mig_tables)
print(f"\nMissing from migrations ({len(missing)}):")
for t in missing:
    print(f"  - {t}")

extra = sorted(mig_tables - schema_tables)
print(f"\nExtra in migrations ({len(extra)}):")
for t in extra:
    print(f"  - {t}")
