"""
Test Translation Agent
Dedicated test script for translation agent
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.agents.translation import translation_agent


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


async def test_translation_agent():
    """Test translation agent with different scenarios"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}Translation Agent Test{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")
    
    # Test cases: (message, description)
    test_cases = [
        ("Translate 'hello' to Vietnamese", "EN→VI explicit"),
        ("How do you say 'thank you' in Vietnamese?", "EN→VI question format"),
        ("Xin chào", "VI→EN (auto-detect)"),
        ("Cảm ơn bạn rất nhiều!", "VI→EN explicit"),
        ("Break a leg", "EN→VI idiom"),
    ]
    
    results = []
    
    for i, (message, description) in enumerate(test_cases, 1):
        print(f"{Colors.BOLD}Test {i}: {description}{Colors.RESET}")
        print(f"  Message: \"{message}\"")
        
        state: TutorState = {
            "messages": [HumanMessage(content=message)],
            "conversation_id": f"test_trans_{i}",
            "user_id": "test_user",
        }
        
        try:
            result = await translation_agent(state)
            
            has_data = bool(result.get("translation_data"))
            has_response = bool(result.get("tutor_response"))
            has_chunks = bool(result.get("chunks"))
            
            if has_data and has_response and has_chunks:
                status = f"{Colors.GREEN}✓ PASS{Colors.RESET}"
                results.append(True)
            else:
                status = f"{Colors.RED}✗ FAIL{Colors.RESET}"
                results.append(False)
            
            print(f"  Result: {status}")
            print(f"    Has data: {has_data} {'✓' if has_data else '✗'}")
            print(f"    Has response: {has_response} {'✓' if has_response else '✗'}")
            print(f"    Has chunks: {has_chunks} {'✓' if has_chunks else '✗'}")
            
            if has_data:
                trans = result["translation_data"]
                source_text = trans.get("source_text", "")
                translation = trans.get("translation", "")
                source_lang = trans.get("source_language", "")
                target_lang = trans.get("target_language", "")
                confidence = trans.get("confidence", 0)
                
                print(f"    {source_lang.upper()}: {source_text}")
                print(f"    {target_lang.upper()}: {translation}")
                print(f"    Confidence: {confidence:.0%}")
            
            if has_response:
                response_preview = result.get("tutor_response", "")[:100]
                print(f"    Response preview: {response_preview}...")
            
            print()
            
        except Exception as e:
            print(f"  {Colors.RED}✗ ERROR: {e}{Colors.RESET}\n")
            results.append(False)
            import traceback
            traceback.print_exc()
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}Test Summary{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")
    print(f"Passed: {Colors.GREEN}{passed}/{total}{Colors.RESET}")
    print(f"Failed: {Colors.RED}{total - passed}/{total}{Colors.RESET}\n")
    
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✅ All tests passed!{Colors.RESET}\n")
    else:
        print(f"{Colors.RED}{Colors.BOLD}❌ Some tests failed{Colors.RESET}\n")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(test_translation_agent())
    sys.exit(0 if success else 1)

