"""
Fix PostgreSQL Password
Reset password for english_tutor_agent user
"""

import subprocess
import sys


def fix_password():
    """Reset password using docker exec"""
    print("=" * 60)
    print("Fixing PostgreSQL Password")
    print("=" * 60)
    print()
    
    # Connect as superuser and reset password
    # We need to connect as the user that was created (which is superuser)
    password = "english_tutor_agent_password"
    
    commands = [
        # First, try to connect and reset password
        f"docker exec english-tutor-agent-postgres psql -U english_tutor_agent -d postgres -c \"ALTER USER english_tutor_agent WITH PASSWORD '{password}';\"",
        # Verify
        f"docker exec english-tutor-agent-postgres psql -U english_tutor_agent -d english_tutor_agent -c \"SELECT current_user;\""
    ]
    
    for i, cmd in enumerate(commands, 1):
        print(f"{i}. Running: {cmd.split(' -c ')[0]}...")
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print(f"   ✅ Success")
                if result.stdout.strip():
                    print(f"   Output: {result.stdout.strip()}")
            else:
                print(f"   ❌ Failed")
                print(f"   Error: {result.stderr.strip()}")
        except Exception as e:
            print(f"   ❌ Exception: {e}")
        print()
    
    print("Testing connection from host...")
    test_cmd = f"$env:PGPASSWORD='{password}'; psql -h localhost -p 5433 -U english_tutor_agent -d english_tutor_agent -c 'SELECT current_user;'"
    try:
        result = subprocess.run(["powershell", "-Command", test_cmd], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Connection from host successful!")
            print(f"   Output: {result.stdout.strip()}")
        else:
            print("❌ Connection from host failed")
            print(f"   Error: {result.stderr.strip()}")
    except Exception as e:
        print(f"❌ Exception: {e}")


if __name__ == "__main__":
    fix_password()

