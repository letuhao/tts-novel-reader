"""
Test Vocabulary Agent
Dedicated test script for vocabulary agent
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.agents.vocabulary import vocabulary_agent


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


async def test_vocabulary_agent():
    """Test vocabulary agent with different scenarios"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}Vocabulary Agent Test{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")
    
    # Test cases
    test_cases = [
        ("What does 'serendipity' mean?", "Word definition"),
        ("Give me synonyms for 'happy'", "Synonyms request"),
        ("What's the difference between 'big' and 'large'?", "Word comparison"),
        ("Show me examples of using 'although'", "Usage examples"),
        ("Create a vocabulary quiz", "Vocabulary quiz"),
    ]
    
    results = []
    
    for i, (message, description) in enumerate(test_cases, 1):
        print(f"{Colors.BOLD}Test {i}: {description}{Colors.RESET}")
        print(f"  Message: \"{message}\"")
        
        state: TutorState = {
            "messages": [HumanMessage(content=message)],
            "conversation_id": f"test_vocab_{i}",
            "user_id": "test_user",
        }
        
        try:
            result = await vocabulary_agent(state)
            
            has_data = bool(result.get("vocabulary_data"))
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
                vocab = result["vocabulary_data"]
                target_word = vocab.get("target_word", "")
                definitions = len(vocab.get("definitions", []))
                synonyms = len(vocab.get("synonyms", []))
                examples = len(vocab.get("examples", []))
                
                print(f"    Target word: '{target_word}'")
                print(f"    Definitions: {definitions}")
                print(f"    Synonyms: {synonyms}")
                print(f"    Examples: {examples}")
            
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
    success = asyncio.run(test_vocabulary_agent())
    sys.exit(0 if success else 1)

