"""
Test PostgreSQL Connection
Test connection with different methods
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.config import get_settings


def test_psycopg():
    """Test with psycopg directly"""
    print("=" * 60)
    print("Test 1: psycopg.connect()")
    print("=" * 60)
    
    try:
        import psycopg
        settings = get_settings()
        conn_str = settings.database_url
        
        print(f"Connection string: {conn_str.split('@')[1] if '@' in conn_str else conn_str}")
        
        conn = psycopg.connect(conn_str)
        print("✅ Connection successful with psycopg")
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"   PostgreSQL version: {version[:50]}...")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False


def test_postgres_saver():
    """Test PostgresSaver"""
    print("\n" + "=" * 60)
    print("Test 2: PostgresSaver.from_conn_string()")
    print("=" * 60)
    
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        settings = get_settings()
        conn_str = settings.database_url
        
        print(f"Connection string: {conn_str.split('@')[1] if '@' in conn_str else conn_str}")
        
        checkpointer_cm = PostgresSaver.from_conn_string(conn_str)
        print("✅ Context manager created")
        
        with checkpointer_cm as checkpointer:
            print("✅ Context entered")
            print(f"   Type: {type(checkpointer).__name__}")
            
            if hasattr(checkpointer, 'setup'):
                print("   Calling setup()...")
                checkpointer.setup()
                print("✅ Setup complete")
            else:
                print("   ⚠️  Setup method not found")
        
        return True
    except Exception as e:
        print(f"❌ PostgresSaver failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_connection_strings():
    """Test different connection string formats"""
    print("\n" + "=" * 60)
    print("Test 3: Different Connection String Formats")
    print("=" * 60)
    
    settings = get_settings()
    base_url = settings.database_url
    
    formats = [
        ("Original", base_url),
        ("With quote_plus", base_url.replace(":", "%3A").replace("@", "%40")),
    ]
    
    for name, conn_str in formats:
        print(f"\n{name}:")
        print(f"  {conn_str[:80]}...")
        try:
            import psycopg
            conn = psycopg.connect(conn_str)
            print(f"  ✅ Success")
            conn.close()
        except Exception as e:
            print(f"  ❌ Failed: {e}")


if __name__ == "__main__":
    print("\n")
    result1 = test_psycopg()
    result2 = test_postgres_saver()
    test_connection_strings()
    
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"psycopg.connect(): {'✅' if result1 else '❌'}")
    print(f"PostgresSaver: {'✅' if result2 else '❌'}")
    print()

