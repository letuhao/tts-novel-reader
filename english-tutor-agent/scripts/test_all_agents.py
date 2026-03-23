"""
Test All Agents
Comprehensive test for all agents (Router, Tutor, Grammar, Exercise)
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.workflows.tutor_workflow import build_workflow


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


async def test_all_agents():
    """Test all agents with different scenarios"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}Comprehensive Agent Test{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")
    
    # Use checkpointer from environment (Redis if available, otherwise Memory)
    # If REDIS_URL is set, it will use RedisSaver (async-capable)
    app = build_workflow(use_memory_for_tests=False, require_async_checkpointer=True)
    
    # Check which checkpointer is being used
    checkpointer_type = type(app.checkpointer).__name__
    print(f"{Colors.BOLD}Checkpointer: {checkpointer_type}{Colors.RESET}\n")
    
    # Test cases: (message, expected_intent, expected_agent, description)
    test_cases = [
        ("Hello, how are you?", "conversation", "tutor", "General conversation"),
        ("Check my grammar: I go to school yesterday", "grammar", "grammar", "Grammar check"),
        ("I want an exercise to practice", "exercise", "exercise", "Exercise request"),
        ("Give me a grammar exercise", "exercise", "exercise", "Grammar exercise request"),
        ("What does 'hello' mean?", "vocabulary", "vocabulary", "Vocabulary question"),
        ("How do I pronounce 'pronunciation'?", "pronunciation", "pronunciation", "Pronunciation practice"),
        ("Translate 'hello' to Vietnamese", "translation", "translation", "Translation request"),
    ]
    
    results = []
    
    for i, (message, expected_intent, expected_agent, description) in enumerate(test_cases, 1):
        print(f"{Colors.BOLD}Test {i}: {description}{Colors.RESET}")
        print(f"  Message: \"{message}\"")
        print(f"  Expected: intent={expected_intent}, agent={expected_agent}")
        
        state: TutorState = {
            "messages": [HumanMessage(content=message)],
            "conversation_id": f"test_{i}",
            "user_id": "test_user",
            "workflow_stage": "routing",
        }
        
        config = {"configurable": {"thread_id": state["conversation_id"]}}
        
        try:
            result = await app.ainvoke(state, config=config)
            
            actual_intent = result.get("intent")
            actual_agent = result.get("current_agent")
            has_response = bool(result.get("tutor_response"))
            
            # Check results
            intent_match = actual_intent == expected_intent
            agent_match = actual_agent == expected_agent
            
            if intent_match and agent_match and has_response:
                status = f"{Colors.GREEN}✓ PASS{Colors.RESET}"
                results.append(True)
            else:
                status = f"{Colors.RED}✗ FAIL{Colors.RESET}"
                results.append(False)
            
            print(f"  Result: {status}")
            print(f"    Intent: {actual_intent} {'✓' if intent_match else '✗'}")
            print(f"    Agent: {actual_agent} {'✓' if agent_match else '✗'}")
            print(f"    Has response: {has_response} {'✓' if has_response else '✗'}")
            
            # Show specific results based on agent
            if actual_agent == "grammar" and "grammar_analysis" in result:
                analysis = result["grammar_analysis"]
                errors = len(analysis.get("errors", []))
                score = analysis.get("overall_score", 0)
                print(f"    Grammar: {errors} errors, score {score}/100")
            
            if actual_agent == "exercise" and "exercise_data" in result:
                exercise = result["exercise_data"]
                print(f"    Exercise: {exercise.get('type')} on {exercise.get('topic')}")
            
            if actual_agent == "pronunciation" and "pronunciation_feedback" in result:
                feedback = result["pronunciation_feedback"]
                target_text = feedback.get("target_text", "")
                difficulty = feedback.get("difficulty_level", "")
                print(f"    Pronunciation: target='{target_text}', level={difficulty}")
            
            if actual_agent == "vocabulary" and "vocabulary_data" in result:
                vocab = result["vocabulary_data"]
                target_word = vocab.get("target_word", "")
                difficulty = vocab.get("difficulty_level", "")
                print(f"    Vocabulary: word='{target_word}', level={difficulty}")
            
            if actual_agent == "translation" and "translation_data" in result:
                trans = result["translation_data"]
                source_lang = trans.get("source_language", "")
                target_lang = trans.get("target_language", "")
                translation = trans.get("translation", "")[:50]
                print(f"    Translation: {source_lang}→{target_lang}, translation='{translation}...'")
            
            if has_response:
                response_preview = result.get("tutor_response", "")[:80]
                print(f"    Response: {response_preview}...")
            
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
    success = asyncio.run(test_all_agents())
    sys.exit(0 if success else 1)

