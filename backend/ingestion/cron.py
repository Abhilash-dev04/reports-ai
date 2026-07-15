"""Indexing utilities - called during upload, not scheduled."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.connection import get_db
from backend.embedding.model import encode_text

def run_indexing():
    """Generate embeddings for reports without embeddings."""
    db = get_db(admin=True)

    # Find reports without embeddings
    db.execute("SELECT id, report_name, functional_area, package_name FROM reports WHERE embedding IS NULL")
    rows = db.fetchall()

    indexed = 0
    for row in rows:
        search_text = f"{row['report_name']} {row['functional_area']} {row['package_name']}"
        embedding = encode_text(search_text)
        emb_str = f"[{','.join(str(x) for x in embedding)}]"

        db.execute(
            "UPDATE reports SET embedding = %s::vector WHERE id = %s",
            (emb_str, row['id'])
        )
        indexed += 1

    db.connection.commit()
    db.close()
    print(f"Indexed {indexed} reports")
    return indexed
