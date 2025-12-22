"""
Setup PostgreSQL Checkpointer Tables
Setup tables for LangGraph PostgresSaver
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.config import get_settings
from langgraph.checkpoint.postgres import PostgresSaver


def setup_postgres_checkpointer():
    """Setup PostgreSQL checkpointer tables"""
    print("=" * 60)
    print("Setting up PostgreSQL Checkpointer")
    print("=" * 60)
    print()
    
    settings = get_settings()
    database_url = settings.database_url
    
    if not database_url:
        print("❌ DATABASE_URL not configured in settings")
        print("   Please set DATABASE_URL in .env file")
        return False
    
    print(f"Database URL: {database_url.split('@')[1] if '@' in database_url else 'configured'}")
    print()
    
    try:
        print("1. Creating PostgresSaver context manager...")
        checkpointer_cm = PostgresSaver.from_conn_string(database_url)
        print("   ✅ Context manager created")
        print()
        
        print("2. Entering context manager and setting up tables...")
        with checkpointer_cm as checkpointer:
            print("   ✅ Context entered")
            print(f"   Type: {type(checkpointer).__name__}")
            
            if hasattr(checkpointer, 'setup'):
                print("   Setting up tables...")
                checkpointer.setup()
                print("   ✅ Tables setup complete")
            else:
                print("   ⚠️  Setup method not found")
        
        print()
        print("=" * 60)
        print("✅ PostgreSQL Checkpointer Setup Complete!")
        print("=" * 60)
        print()
        print("Tables created:")
        print("  - checkpoints")
        print("  - checkpoint_writes")
        print()
        print("You can now use PostgreSQL checkpointer in your workflow.")
        print()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = setup_postgres_checkpointer()
    sys.exit(0 if success else 1)

