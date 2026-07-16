"""
Reset admin password in Supabase users table
Run this locally to set a new password for admin user
"""
import os
import psycopg
from passlib.context import CryptContext

# Password to set for admin
NEW_PASSWORD = "Admin@123"  # Change this if you want

def reset_admin_password():
    # Get database connection string from .env or environment
    conn_str = os.environ.get("DATABASE_URL_ADMIN") or os.environ.get("DATABASE_URL")

    if not conn_str:
        print("ERROR: DATABASE_URL not found in environment")
        print("Make sure your .env file is loaded or set DATABASE_URL manually")
        return

    # Hash the password
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password_hash = pwd_context.hash(NEW_PASSWORD)

    try:
        db = psycopg.connect(conn_str)
        cursor = db.cursor()

        # Check if admin exists
        cursor.execute("SELECT user_id FROM users WHERE username = 'admin'")
        admin = cursor.fetchone()

        if admin:
            # Update existing admin password
            cursor.execute(
                "UPDATE users SET password_hash = %s WHERE username = 'admin'",
                (password_hash,)
            )
            print(f"✅ Admin password updated successfully!")
        else:
            # Create admin user if not exists
            cursor.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                ("admin", password_hash, "admin")
            )
            print(f"✅ Admin user created successfully!")

        db.commit()
        cursor.close()
        db.close()

        print(f"
New admin password: {NEW_PASSWORD}")
        print("You can now login with:")
        print(f"  Username: admin")
        print(f"  Password: {NEW_PASSWORD}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Try to load .env file
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    reset_admin_password()
