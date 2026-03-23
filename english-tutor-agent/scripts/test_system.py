"""
Comprehensive System Test
Test all components of the English Tutor Agent system
"""

import asyncio
import sys
import os
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.config import get_settings
from src.workflows.tutor_workflow import build_workflow


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_section(title: str):
    """Print section header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.RESET}\n")


def print_test(name: str, status: bool, details: str = ""):
    """Print test result"""
    status_text = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if status else f"{Colors.RED}✗ FAIL{Colors.RESET}"
    print(f"  {status_text} {name}")
    if details:
        print(f"    {details}")


async def test_configuration():
    """Test 1: Configuration"""
    print_section("Test 1: Configuration")
    
    try:
        settings = get_settings()
        print_test("Settings loaded", True)
        print_test(f"Ollama URL: {settings.ollama_base_url}", True)
        print_test(f"Ollama Model: {settings.ollama_model}", True)
        print_test(f"Router Mode: {settings.router_mode}", True)
        print_test(f"API Port: {settings.api_port}", True)
        return True
    except Exception as e:
        print_test("Settings loaded", False, str(e))
        return False


async def test_ollama_connection():
    """Test 2: Ollama Connection"""
    print_section("Test 2: Ollama Connection")
    
    try:
        import httpx
        settings = get_settings()
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Test connection
            response = await client.get(f"{settings.ollama_base_url}/api/tags")
            if response.status_code == 200:
                print_test("Ollama connection", True)
                
                # Check if model is available
                models = response.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                if settings.ollama_model in model_names:
                    print_test(f"Model {settings.ollama_model} available", True)
                else:
                    print_test(f"Model {settings.ollama_model} available", False, 
                             f"Available models: {', '.join(model_names[:3])}")
                return True
            else:
                print_test("Ollama connection", False, f"Status: {response.status_code}")
                return False
    except httpx.ConnectError:
        print_test("Ollama connection", False, "Cannot connect. Is Ollama running?")
        return False
    except Exception as e:
        print_test("Ollama connection", False, str(e))
        return False


async def test_workflow_build():
    """Test 3: Workflow Build"""
    print_section("Test 3: Workflow Build")
    
    try:
        # Force MemorySaver for async tests: PostgresSaver currently doesn't implement async methods (aget_tuple, etc.)
        app = build_workflow(use_memory_for_tests=True, require_async_checkpointer=True)
        print_test("Workflow builds", True)
        
        checkpointer_type = type(app.checkpointer).__name__
        print_test(f"Checkpointer type: {checkpointer_type}", True)
        
        return True
    except Exception as e:
        print_test("Workflow builds", False, str(e))
        import traceback
        traceback.print_exc()
        return False


async def test_keyword_router():
    """Test 4: Keyword Router"""
    print_section("Test 4: Keyword Router")
    
    try:
        from src.agents.router import router_agent
        
        test_cases = [
            ("I want to check my grammar", "grammar"),
            ("How do I pronounce this word?", "pronunciation"),
            ("Give me an exercise", "exercise"),
            ("What does this word mean?", "vocabulary"),
            ("Hello, how are you?", "conversation"),
        ]
        
        all_passed = True
        for message, expected_intent in test_cases:
            state: TutorState = {
                "messages": [HumanMessage(content=message)],
                "conversation_id": "test",
                "user_id": "test",
            }
            
            result = router_agent(state)
            intent = result.get("intent")
            confidence = result.get("routing_confidence", 0)
            
            passed = intent == expected_intent
            all_passed = all_passed and passed
            
            status = "✓" if passed else "✗"
            print(f"  {status} '{message[:40]}...' → {intent} (confidence: {confidence:.2f})")
            
        print_test("Keyword router", all_passed, f"Tested {len(test_cases)} cases")
        return all_passed
    except Exception as e:
        print_test("Keyword router", False, str(e))
        return False


async def test_llm_router():
    """Test 5: LLM Router (if Ollama available)"""
    print_section("Test 5: LLM Router")
    
    # Check if Ollama is available
    try:
        import httpx
        settings = get_settings()
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.get(f"{settings.ollama_base_url}/api/tags")
    except:
        print_test("LLM router", False, "Ollama not available, skipping")
        return None  # Skip test
    
    try:
        from src.agents.router_llm import router_agent_llm
        
        test_message = "I want to check my grammar errors"
        state: TutorState = {
            "messages": [HumanMessage(content=test_message)],
            "conversation_id": "test_llm",
            "user_id": "test",
        }
        
        result = await router_agent_llm(state)
        intent = result.get("intent")
        confidence = result.get("routing_confidence", 0)
        method = result.get("metadata", {}).get("routing_method", "unknown")
        
        print_test("LLM router", True, 
                  f"Intent: {intent}, Confidence: {confidence:.2f}, Method: {method}")
        return True
    except Exception as e:
        print_test("LLM router", False, str(e))
        import traceback
        traceback.print_exc()
        return False


async def test_hybrid_router():
    """Test 6: Hybrid Router (if Ollama available)"""
    print_section("Test 6: Hybrid Router")
    
    # Check if Ollama is available
    try:
        import httpx
        settings = get_settings()
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.get(f"{settings.ollama_base_url}/api/tags")
    except:
        print_test("Hybrid router", False, "Ollama not available, skipping")
        return None  # Skip test
    
    try:
        from src.agents.router_hybrid import router_agent_hybrid
        
        # Ambiguous multi-intent message should force LLM routing
        test_message = "What does this word mean? Please translate it to Vietnamese."
        state: TutorState = {
            "messages": [HumanMessage(content=test_message)],
            "conversation_id": "test_hybrid",
            "user_id": "test",
        }
        
        result = await router_agent_hybrid(state)
        intent = result.get("intent")
        confidence = result.get("routing_confidence", 0)
        method = result.get("metadata", {}).get("routing_method", "unknown")

        # For ambiguous prompts, hybrid router should go through LLM path
        ok = method.startswith("hybrid_llm")
        print_test(
            "Hybrid router",
            ok,
            f"Intent: {intent}, Confidence: {confidence:.2f}, Method: {method}",
        )
        return ok
    except Exception as e:
        print_test("Hybrid router", False, str(e))
        import traceback
        traceback.print_exc()
        return False


async def test_workflow_execution():
    """Test 7: Full Workflow Execution (if Ollama available)"""
    print_section("Test 7: Full Workflow Execution")
    
    # Check if Ollama is available
    try:
        import httpx
        settings = get_settings()
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.get(f"{settings.ollama_base_url}/api/tags")
    except:
        print_test("Workflow execution", False, "Ollama not available, skipping")
        return None  # Skip test
    
    try:
        # Force MemorySaver for async tests: PostgresSaver currently doesn't implement async methods (aget_tuple, etc.)
        app = build_workflow(use_memory_for_tests=True, require_async_checkpointer=True)
        
        initial_state: TutorState = {
            "messages": [HumanMessage(content="Hello, I want to learn English")],
            "conversation_id": f"test_workflow_{datetime.now().timestamp()}",
            "user_id": "test_user",
            "workflow_stage": "routing",
        }
        
        config = {"configurable": {"thread_id": initial_state["conversation_id"]}}
        
        print("  Running workflow...")
        # Use ainvoke for async nodes
        result = await app.ainvoke(initial_state, config=config)
        
        has_response = bool(result.get("tutor_response"))
        has_chunks = bool(result.get("chunks"))
        intent = result.get("intent")
        
        print_test("Workflow execution", has_response and has_chunks,
                  f"Intent: {intent}, Has response: {has_response}, Has chunks: {has_chunks}")
        
        if has_response:
            response_preview = result.get("tutor_response", "")[:100]
            print(f"    Response preview: {response_preview}...")
        
        return has_response and has_chunks
    except Exception as e:
        print_test("Workflow execution", False, str(e))
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print(f"\n{Colors.BOLD}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}English Tutor Agent - System Test{Colors.RESET}")
    print(f"{Colors.BOLD}{'=' * 60}{Colors.RESET}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    results = {}
    
    # Run tests
    results["configuration"] = await test_configuration()
    results["ollama"] = await test_ollama_connection()
    results["workflow_build"] = await test_workflow_build()
    results["keyword_router"] = await test_keyword_router()
    results["llm_router"] = await test_llm_router()
    results["hybrid_router"] = await test_hybrid_router()
    results["workflow_execution"] = await test_workflow_execution()
    
    # Summary
    print_section("Test Summary")
    
    passed = 0
    failed = 0
    skipped = 0
    
    for test_name, result in results.items():
        if result is True:
            passed += 1
            print(f"  {Colors.GREEN}✓{Colors.RESET} {test_name}")
        elif result is False:
            failed += 1
            print(f"  {Colors.RED}✗{Colors.RESET} {test_name}")
        else:  # None (skipped)
            skipped += 1
            print(f"  {Colors.YELLOW}⊘{Colors.RESET} {test_name} (skipped)")
    
    print(f"\n{Colors.BOLD}Results:{Colors.RESET}")
    print(f"  {Colors.GREEN}Passed: {passed}{Colors.RESET}")
    print(f"  {Colors.RED}Failed: {failed}{Colors.RESET}")
    if skipped > 0:
        print(f"  {Colors.YELLOW}Skipped: {skipped}{Colors.RESET}")
    
    print(f"\n{Colors.BOLD}{'=' * 60}{Colors.RESET}\n")
    
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

