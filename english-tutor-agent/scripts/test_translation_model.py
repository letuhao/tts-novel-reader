"""
Test Translation Model Capability
Test gemma3:12b Vietnamese translation quality before implementing Translation Agent
"""

import asyncio
import sys
import os
import json
import httpx
from datetime import datetime

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


async def test_translation(model: str, text: str, direction: str, expected_quality: str = "good") -> dict:
    """
    Test translation quality
    
    Args:
        model: Model name to test
        text: Text to translate
        direction: "en-vi" or "vi-en"
        expected_quality: Expected quality level (for logging)
    """
    settings = get_settings()
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", settings.ollama_base_url)
    
    # Prepare prompt based on direction
    if direction == "en-vi":
        prompt = f"""Translate the following English text to Vietnamese. Provide a natural, accurate translation that preserves the meaning and cultural context.

English text: "{text}"

Vietnamese translation:"""
    else:  # vi-en
        prompt = f"""Translate the following Vietnamese text to English. Provide a natural, accurate translation that preserves the meaning and cultural context.

Vietnamese text: "{text}"

English translation:"""
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ollama_base_url}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert translator. Provide accurate, natural translations that preserve meaning and cultural context."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.3,  # Lower temperature for more consistent translation
                    }
                },
            )
            response.raise_for_status()
            result = response.json()
            translation = result.get("message", {}).get("content", "").strip()
            
            return {
                "success": True,
                "translation": translation,
                "model": model,
                "direction": direction,
                "error": None,
            }
    except Exception as e:
        return {
            "success": False,
            "translation": None,
            "model": model,
            "direction": direction,
            "error": str(e),
        }


async def test_comprehensive_translation():
    """Test comprehensive translation scenarios"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}Translation Model Capability Test{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    settings = get_settings()
    model = os.getenv("OLLAMA_MODEL", settings.ollama_model)
    
    print(f"{Colors.BOLD}Testing Model: {model}{Colors.RESET}\n")
    
    # Test cases: (text, direction, category, description)
    test_cases = [
        # Simple sentences
        ("Hello, how are you?", "en-vi", "Simple", "Basic greeting"),
        ("Thank you very much!", "en-vi", "Simple", "Common expression"),
        ("I love learning English.", "en-vi", "Simple", "Simple statement"),
        
        # Complex sentences
        ("I would appreciate if you could help me with this matter.", "en-vi", "Complex", "Formal request"),
        ("Could you please explain this concept in more detail?", "en-vi", "Complex", "Polite question"),
        ("The weather today is quite pleasant, don't you think?", "en-vi", "Complex", "Opinion with question tag"),
        
        # Idioms and phrases
        ("Break a leg!", "en-vi", "Idiom", "Common idiom (good luck)"),
        ("It's raining cats and dogs.", "en-vi", "Idiom", "Weather idiom"),
        ("Once in a blue moon.", "en-vi", "Idiom", "Frequency idiom"),
        
        # Cultural context
        ("Let's have some small talk.", "en-vi", "Cultural", "Cultural concept"),
        ("Cheers!", "en-vi", "Cultural", "Casual expression"),
        ("I'll catch you later!", "en-vi", "Cultural", "Informal goodbye"),
        
        # Vietnamese to English (test bidirectional)
        ("Xin chào, bạn khỏe không?", "vi-en", "Simple", "Basic greeting"),
        ("Cảm ơn bạn rất nhiều!", "vi-en", "Simple", "Thank you"),
        ("Tôi muốn học tiếng Anh.", "vi-en", "Simple", "Simple statement"),
    ]
    
    results = []
    
    for i, (text, direction, category, description) in enumerate(test_cases, 1):
        print(f"{Colors.BOLD}Test {i}/{len(test_cases)}: {category} - {description}{Colors.RESET}")
        print(f"  Direction: {direction.upper()}")
        print(f"  Original: {Colors.YELLOW}{text}{Colors.RESET}")
        
        result = await test_translation(model, text, direction)
        
        if result["success"]:
            translation = result["translation"]
            print(f"  Translation: {Colors.GREEN}{translation}{Colors.RESET}")
            
            # Quick quality assessment (basic checks)
            quality_notes = []
            if len(translation) > 0:
                quality_notes.append("✓ Has output")
            if len(translation) > len(text) * 0.3:  # Rough length check
                quality_notes.append("✓ Reasonable length")
            
            if quality_notes:
                print(f"  Quality: {', '.join(quality_notes)}")
            
            results.append({
                "test": i,
                "category": category,
                "direction": direction,
                "original": text,
                "translation": translation,
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
        
        # Small delay to avoid rate limiting
        await asyncio.sleep(0.5)
    
    # Summary
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}Test Summary{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}\n")
    
    successful = sum(1 for r in results if r["success"])
    total = len(results)
    
    print(f"Total Tests: {total}")
    print(f"Successful: {Colors.GREEN}{successful}/{total}{Colors.RESET}")
    print(f"Failed: {Colors.RED}{total - successful}/{total}{Colors.RESET}\n")
    
    # Category breakdown
    categories = {}
    for r in results:
        cat = r["category"]
        if cat not in categories:
            categories[cat] = {"total": 0, "success": 0}
        categories[cat]["total"] += 1
        if r["success"]:
            categories[cat]["success"] += 1
    
    print(f"{Colors.BOLD}By Category:{Colors.RESET}")
    for cat, stats in categories.items():
        success_rate = (stats["success"] / stats["total"]) * 100
        color = Colors.GREEN if success_rate == 100 else Colors.YELLOW if success_rate >= 80 else Colors.RED
        print(f"  {cat}: {color}{stats['success']}/{stats['total']} ({success_rate:.0f}%){Colors.RESET}")
    
    # Direction breakdown
    directions = {}
    for r in results:
        dir_key = r["direction"]
        if dir_key not in directions:
            directions[dir_key] = {"total": 0, "success": 0}
        directions[dir_key]["total"] += 1
        if r["success"]:
            directions[dir_key]["success"] += 1
    
    print(f"\n{Colors.BOLD}By Direction:{Colors.RESET}")
    for dir_key, stats in directions.items():
        success_rate = (stats["success"] / stats["total"]) * 100
        color = Colors.GREEN if success_rate == 100 else Colors.YELLOW if success_rate >= 80 else Colors.RED
        print(f"  {dir_key.upper()}: {color}{stats['success']}/{stats['total']} ({success_rate:.0f}%){Colors.RESET}")
    
    # Recommendation
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}Recommendation:{Colors.RESET}")
    
    if successful == total:
        print(f"{Colors.GREEN}✅ Model {model} is SUITABLE for Translation Agent{Colors.RESET}")
        print(f"   All translations succeeded. Quality looks good for implementation.")
    elif successful >= total * 0.8:
        print(f"{Colors.YELLOW}⚠️  Model {model} is MOSTLY SUITABLE for Translation Agent{Colors.RESET}")
        print(f"   Most translations succeeded. Consider testing specific failure cases.")
    else:
        print(f"{Colors.RED}❌ Model {model} may NOT be suitable for Translation Agent{Colors.RESET}")
        print(f"   Many translations failed. Consider alternatives:")
        print(f"   - Test other models (qwen2.5, llama3.2)")
        print(f"   - Use translation API service (Google/Microsoft/DeepL)")
    
    print()
    
    # Save results to file
    results_file = f"translation_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump({
            "model": model,
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total,
                "successful": successful,
                "failed": total - successful,
            },
            "categories": categories,
            "directions": directions,
            "results": results,
        }, f, indent=2, ensure_ascii=False)
    
    print(f"Detailed results saved to: {Colors.CYAN}{results_file}{Colors.RESET}\n")
    
    return successful == total


if __name__ == "__main__":
    try:
        success = asyncio.run(test_comprehensive_translation())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Test interrupted by user{Colors.RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Test failed with error: {e}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

