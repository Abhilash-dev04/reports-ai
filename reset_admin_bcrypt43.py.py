"""
Reset admin password with bcrypt 4.3.0 compatible hash
Run this locally after: pip install bcrypt==4.3.0 psycopg[binary]==3.1.18
"""
import os
import psycopg

# Your Supabase connection
DB_URL = "postgresql://postgres.idkuoxucvolmurtypclf:AbhiReportsAI2026@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# New admin password
NEW_PASSWORD = "Admin@123"

def main():
    try:
        # Connect to database
        conn = psycopg.connect(DB_URL)
        cursor = conn.cursor()
        
        # Generate bcrypt hash using bcrypt directly (not passlib)
        import bcrypt
        password_bytes = NEW_PASSWORD.encode('utf-8')
        salt = bcrypt.gensalt(rounds=12)
        password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        
        print(f"Generated hash: {password_hash}")
        print(f"Hash length: {len(password_hash)} bytes")
        
        # Update admin password
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE username = %s",
            (password_hash, 'admin')
        )
        
        if cursor.rowcount == 0:
            print("Admin user not found! Creating new admin user...")
            cursor.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                ('admin', password_hash, 'admin')
            )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Admin password updated successfully!")
        print(f"Username: admin")
        print(f"Password: {NEW_PASSWORD}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()