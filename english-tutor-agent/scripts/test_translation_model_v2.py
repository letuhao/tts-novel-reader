"""
Test Translation Model Capability V2
Test với prompt ngắn gọn để lấy translation trực tiếp (không có explanation)
"""

import asyncio
import sys
import os
import json
import httpx
from datetime import datetime
import re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.config import get_settings


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


async def test_translation_concise(model: str, text: str, direction: str) -> dict:
    """
    Test translation với prompt ngắn gọn, yêu cầu translation trực tiếp
    """
    settings = get_settings()
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", settings.ollama_base_url)
    
    # Prompt ngắn gọn, yêu cầu translation trực tiếp
    if direction == "en-vi":
        prompt = f"""Translate to Vietnamese. Provide only the translation, no explanation.

"{text}"

Translation:"""
    else:  # vi-en
        prompt = f"""Translate to English. Provide only the translation, no explanation.

"{text}"

Translation:"""
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ollama_base_url}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a translator. Provide only the translation, no explanations or additional text."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.2,  # Lower temperature for more focused output
                    }
                },
            )
            response.raise_for_status()
            result = response.json()
            raw_response = result.get("message", {}).get("content", "").strip()
            
            # Extract translation (try to get just the translation part)
            translation = raw_response
            # Try to extract content in quotes if present
            quote_match = re.search(r'["\']([^"\']+)["\']', raw_response)
            if quote_match:
                translation = quote_match.group(1)
            else:
                # Try to get first line or sentence
                lines = raw_response.split('\n')
                # Skip lines that are labels/explanations
                for line in lines:
                    line = line.strip()
                    if line and not line.lower().startswith(('translation:', 'english translation:', 'vietnamese translation:', 'here', 'this', 'the translation')):
                        # Check if line looks like actual translation (not explanation)
                        if len(line) < 200 and not line.endswith(':'):
                            translation = line
                            break
            
            return {
                "success": True,
                "translation": translation,
                "raw_response": raw_response,  # Keep raw for analysis
                "model": model,
                "direction": direction,
                "error": None,
            }
    except Exception as e:
        return {
            "success": False,
            "translation": None,
            "raw_response": None,
            "model": model,
            "direction": direction,
            "error": str(e),
        }


async def test_concise_translation():
    """Test với prompt ngắn gọn"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}Translation Model Test V2 - Concise Translation{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    settings = get_settings()
    model = os.getenv("OLLAMA_MODEL", settings.ollama_model)
    
    print(f"{Colors.BOLD}Testing Model: {model}{Colors.RESET}")
    print(f"{Colors.BOLD}Prompt Style: Concise (translation only, no explanation){Colors.RESET}\n")
    
    # Reduced test set for faster testing
    test_cases = [
        ("Hello, how are you?", "en-vi", "Simple"),
        ("Thank you very much!", "en-vi", "Simple"),
        ("Break a leg!", "en-vi", "Idiom"),
        ("I would appreciate if you could help me.", "en-vi", "Complex"),
        ("Xin chào, bạn khỏe không?", "vi-en", "Simple"),
        ("Cảm ơn bạn rất nhiều!", "vi-en", "Simple"),
    ]
    
    results = []
    
    for i, (text, direction, category) in enumerate(test_cases, 1):
        print(f"{Colors.BOLD}Test {i}/{len(test_cases)}: {category} ({direction.upper()}){Colors.RESET}")
        print(f"  Original: {Colors.YELLOW}{text}{Colors.RESET}")
        
        result = await test_translation_concise(model, text, direction)
        
        if result["success"]:
            translation = result["translation"]
            raw = result["raw_response"]
            
            # Check if output is concise (not too long)
            is_concise = len(translation) < len(raw) * 0.5 or len(translation) < 200
            
            print(f"  Translation: {Colors.GREEN}{translation}{Colors.RESET}")
            
            if not is_concise:
                print(f"  {Colors.YELLOW}⚠️  Warning: Output may be too verbose{Colors.RESET}")
                print(f"  Raw response length: {len(raw)} chars")
                print(f"  Extracted length: {len(translation)} chars")
            else:
                print(f"  {Colors.GREEN}✓ Concise output{Colors.RESET}")
            
            results.append({
                "test": i,
                "category": category,
                "direction": direction,
                "original": text,
                "translation": translation,
                "raw_response_length": len(raw),
                "translation_length": len(translation),
                "is_concise": is_concise,
                "success": True,
            })
        else:
            print(f"  {Colors.RED}✗ ERROR: {result['error']}{Colors.RESET}")
            results.append({
                "test": i,
                "category": category,
                "direction": direction,
                "original": text,
                "translation": None,
                "success": False,
                "error": result["error"],
            })
        
        print()
        await asyncio.sleep(0.5)
    
    # Summary
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}Test Summary{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}\n")
    
    successful = sum(1 for r in results if r["success"])
    concise_count = sum(1 for r in results if r.get("is_concise", False))
    total = len(results)
    
    print(f"Total Tests: {total}")
    print(f"Successful: {Colors.GREEN}{successful}/{total}{Colors.RESET}")
    print(f"Concise Output: {Colors.GREEN if concise_count == successful else Colors.YELLOW}{concise_count}/{successful}{Colors.RESET}")
    
    # Average response length
    if successful > 0:
        avg_raw_length = sum(r.get("raw_response_length", 0) for r in results if r["success"]) / successful
        avg_trans_length = sum(r.get("translation_length", 0) for r in results if r["success"]) / successful
        print(f"Average raw response length: {avg_raw_length:.0f} chars")
        print(f"Average translation length: {avg_trans_length:.0f} chars")
    
    print()
    
    # Recommendation
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}Recommendation:{Colors.RESET}\n")
    
    if successful == total and concise_count == successful:
        print(f"{Colors.GREEN}✅ Model {model} is SUITABLE for Translation Agent{Colors.RESET}")
        print(f"   All translations succeeded with concise output.")
        print(f"   Recommendation: Use concise prompts with system message.")
    elif successful == total:
        print(f"{Colors.YELLOW}⚠️  Model {model} works but needs prompt engineering{Colors.RESET}")
        print(f"   All translations succeeded but output may be verbose.")
        print(f"   Recommendation: Use structured output (JSON) or post-processing to extract translation.")
    else:
        print(f"{Colors.RED}❌ Model {model} has issues with concise translation{Colors.RESET}")
        print(f"   Some translations failed or are too verbose.")
    
    print()
    
    # Save results
    results_file = f"translation_test_v2_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump({
            "model": model,
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total,
                "successful": successful,
                "concise": concise_count,
            },
            "results": results,
        }, f, indent=2, ensure_ascii=False)
    
    print(f"Results saved to: {Colors.CYAN}{results_file}{Colors.RESET}\n")
    
    return successful == total and concise_count == successful


if __name__ == "__main__":
    try:
        success = asyncio.run(test_concise_translation())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Test interrupted{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Error: {e}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

