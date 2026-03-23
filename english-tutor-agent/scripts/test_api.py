"""
Test API Endpoints
Test FastAPI endpoints
"""

import requests
import json
import time

BASE_URL = "http://localhost:11300"


def test_health():
    """Test health endpoint"""
    print("Testing /health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ Health check passed")
            print(f"    Status: {data.get('status')}")
            print(f"    Service: {data.get('service')}")
            print(f"    Checkpointer: {data.get('checkpointer')}")
            return True
        else:
            print(f"  ✗ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ✗ Health check error: {e}")
        return False


def test_chat(message: str, description: str):
    """Test chat endpoint"""
    print(f"\nTesting chat: {description}")
    print(f"  Message: \"{message}\"")
    
    payload = {
        "message": message,
        "conversation_id": f"test_{int(time.time())}",
        "user_id": "test_user"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/agents/chat",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                result_data = data.get("data", {})
                print(f"  ✓ Chat request successful")
                print(f"    Intent: {result_data.get('intent')}")
                print(f"    Agent: {result_data.get('agent')}")
                print(f"    Chunks: {len(result_data.get('chunks', []))}")
                
                if result_data.get("chunks"):
                    first_chunk = result_data["chunks"][0]
                    preview = first_chunk.get("text", "")[:100]
                    print(f"    Response preview: {preview}...")
                
                return True
            else:
                print(f"  ✗ Chat request failed: {data.get('error')}")
                return False
        else:
            print(f"  ✗ Chat request failed: {response.status_code}")
            print(f"    Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"  ✗ Chat request error: {e}")
        return False


def main():
    """Run all API tests"""
    print("=" * 60)
    print("API Endpoint Tests")
    print("=" * 60)
    
    # Wait a bit for server to be ready
    print("\nWaiting for server...")
    time.sleep(2)
    
    results = []
    
    # Test health
    results.append(("Health", test_health()))
    
    # Test chat endpoints
    test_cases = [
        ("Hello, how are you?", "Conversation"),
        ("Check my grammar: I go to school yesterday", "Grammar check"),
        ("Give me an exercise", "Exercise request"),
    ]
    
    for message, description in test_cases:
        results.append((description, test_chat(message, description)))
        time.sleep(1)  # Small delay between requests
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓" if result else "✗"
        print(f"{status} {name}")
    
    print(f"\nPassed: {passed}/{total}")
    print("=" * 60)
    
    return passed == total


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

