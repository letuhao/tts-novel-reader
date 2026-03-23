"""
Test Database Connection
Test PostgreSQL connection for LangGraph checkpointer
"""

import asyncio
import os
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

async def test_db_connection():
    """Test database connection"""
    print("=" * 50)
    print("Testing Database Connection")
    print("=" * 50)
    
    from src.config import get_settings
    settings = get_settings()
    
    print(f"\n1. Database Configuration:")
    print(f"   - DB Host: {settings.db_host}")
    print(f"   - DB Port: {settings.db_port}")
    print(f"   - DB Name: {settings.db_name}")
    print(f"   - DB User: {settings.db_user}")
    print(f"   - DATABASE_URL: {'Set' if settings.database_url else 'Not set'}")
    
    # Test asyncpg connection
    print("\n2. Testing asyncpg connection...")
    try:
        import asyncpg
        
        database_url = settings.database_url
        if not database_url:
            database_url = f"postgresql://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"
        
        print(f"   Connecting to: {database_url.split('@')[1] if '@' in database_url else 'database'}")
        
        conn = await asyncpg.connect(database_url)
        version = await conn.fetchval('SELECT version()')
        await conn.close()
        
        print(f"   ✓ Connection successful!")
        print(f"   PostgreSQL version: {version.split(',')[0]}")
        
    except Exception as e:
        print(f"   ✗ Connection failed: {e}")
        return False
    
    # Test checkpointer
    print("\n3. Testing LangGraph checkpointer...")
    try:
        from src.services import get_checkpointer
        
        checkpointer = get_checkpointer()
        checkpointer_type = type(checkpointer).__name__
        print(f"   ✓ Checkpointer created: {checkpointer_type}")
        
        if checkpointer_type == "PostgresSaver":
            print("   ✓ Using PostgreSQL checkpointer (persistent)")
        else:
            print("   ⚠ Using MemorySaver (in-memory, not persistent)")
            print("   → To use PostgreSQL, set DATABASE_URL in .env")
        
    except Exception as e:
        print(f"   ✗ Checkpointer creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 50)
    print("Database Connection Test Complete")
    print("=" * 50)
    
    return True


if __name__ == "__main__":
    success = asyncio.run(test_db_connection())
    sys.exit(0 if success else 1)

