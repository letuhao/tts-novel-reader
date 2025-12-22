"""
Test Pronunciation Agent
Dedicated test script for pronunciation agent
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.agents.pronunciation import pronunciation_agent


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


async def test_pronunciation_agent():
    """Test pronunciation agent with different scenarios"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}Pronunciation Agent Test{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")
    
    # Test cases
    test_cases = [
        ("How do I pronounce 'pronunciation'?", "Single word pronunciation"),
        ("Help me practice pronouncing 'thorough'", "Difficult word"),
        ("Can you teach me how to say 'schedule'?", "Word with multiple pronunciations"),
        ("I want to practice saying 'comfortable'", "Multi-syllable word"),
        ("How should I pronounce these words: 'though', 'through', 'thought'?", "Multiple words"),
    ]
    
    results = []
    
    for i, (message, description) in enumerate(test_cases, 1):
        print(f"{Colors.BOLD}Test {i}: {description}{Colors.RESET}")
        print(f"  Message: \"{message}\"")
        
        state: TutorState = {
            "messages": [HumanMessage(content=message)],
            "conversation_id": f"test_pronunciation_{i}",
            "user_id": "test_user",
        }
        
        try:
            result = await pronunciation_agent(state)
            
            has_feedback = bool(result.get("pronunciation_feedback"))
            has_response = bool(result.get("tutor_response"))
            has_chunks = bool(result.get("chunks"))
            
            if has_feedback and has_response and has_chunks:
                status = f"{Colors.GREEN}✓ PASS{Colors.RESET}"
                results.append(True)
            else:
                status = f"{Colors.RED}✗ FAIL{Colors.RESET}"
                results.append(False)
            
            print(f"  Result: {status}")
            print(f"    Has feedback: {has_feedback} {'✓' if has_feedback else '✗'}")
            print(f"    Has response: {has_response} {'✓' if has_response else '✗'}")
            print(f"    Has chunks: {has_chunks} {'✓' if has_chunks else '✗'}")
            
            if has_feedback:
                feedback = result["pronunciation_feedback"]
                target_text = feedback.get("target_text", "")
                difficulty = feedback.get("difficulty_level", "")
                phonetic = feedback.get("phonetic_transcription", "")
                key_points = len(feedback.get("key_points", []))
                tips = len(feedback.get("practice_tips", []))
                
                print(f"    Target text: '{target_text}'")
                print(f"    Difficulty: {difficulty}")
                if phonetic:
                    print(f"    Phonetic: /{phonetic}/")
                print(f"    Key points: {key_points}")
                print(f"    Practice tips: {tips}")
            
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
    success = asyncio.run(test_pronunciation_agent())
    sys.exit(0 if success else 1)

