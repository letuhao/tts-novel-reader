"""
Role Detection Service using Qwen3-8B via Ollama
Dịch vụ Phát hiện Vai diễn sử dụng Qwen3-8B qua Ollama

This service detects male/female/narrator roles and selects appropriate voice IDs.
Dịch vụ này phát hiện vai diễn male/female/narrator và chọn voice IDs phù hợp.
"""
import requests
import json
from typing import List, Dict, Optional
from pathlib import Path
import sys

# Add voice_labels to path
sys.path.insert(0, str(Path(__file__).parent.parent / "tts" / "dangvansam-VietTTS-backend" / "tts_backend"))

try:
    from voice_labels import (
        get_voice_labels_for_llm,
        get_recommended_voice,
        DEFAULT_VOICE_MAPPING,
        is_valid_voice_id
    )
except ImportError:
    # Fallback if voice_labels not found
    def get_voice_labels_for_llm():
        return "quynh: narrator, cdteam: male, nu-nhe-nhang: female"
    def get_recommended_voice(role: str, preference: Optional[str] = None) -> str:
        return DEFAULT_VOICE_MAPPING.get(role, "quynh")
    def is_valid_voice_id(voice_id: str) -> bool:
        return voice_id in ["quynh", "cdteam", "nu-nhe-nhang"]
    DEFAULT_VOICE_MAPPING = {"male": "cdteam", "female": "nu-nhe-nhang", "narrator": "quynh"}


class RoleDetectionService:
    """
    Role detection service using Ollama Qwen3-8B.
    Dịch vụ phát hiện vai diễn sử dụng Ollama Qwen3-8B.
    """
    
    def __init__(self, model_name: str = "qwen3:8b", base_url: str = "http://localhost:11434"):
        """
        Initialize role detection service.
        Khởi tạo dịch vụ phát hiện vai diễn.
        
        Args:
            model_name: Ollama model name
            base_url: Ollama API base URL
        """
        self.model_name = model_name
        self.base_url = base_url
        self.api_url = f"{base_url}/api/generate"
        self.voice_labels = get_voice_labels_for_llm()
    
    def detect_roles(
        self,
        paragraphs: List[str],
        chapter_context: str = "",
        return_voice_ids: bool = True
    ) -> Dict:
        """
        Detect roles for paragraphs and optionally select voice IDs.
        Phát hiện vai diễn cho paragraphs và tùy chọn chọn voice IDs.
        
        Args:
            paragraphs: List of paragraph texts
            chapter_context: Optional full chapter text for context
            return_voice_ids: If True, also return selected voice IDs
            
        Returns:
            Dict with role_map and optionally voice_map:
            {
                "role_map": {0: "narrator", 1: "male", ...},
                "voice_map": {0: "quynh", 1: "cdteam", ...}  # if return_voice_ids=True
            }
        """
        if not paragraphs:
            return {"role_map": {}, "voice_map": {}}
        
        # Step 1: Detect roles for all paragraphs
        # Bước 1: Phát hiện vai diễn cho tất cả paragraphs
        role_map = self._detect_roles_batch(paragraphs, chapter_context)
        
        # Step 2: Select voice IDs based on roles (if requested)
        # Bước 2: Chọn voice IDs dựa trên roles (nếu được yêu cầu)
        voice_map = {}
        if return_voice_ids:
            voice_map = self._select_voice_ids(paragraphs, role_map, chapter_context)
        
        return {
            "role_map": role_map,
            "voice_map": voice_map
        }
    
    def _detect_roles_batch(
        self,
        paragraphs: List[str],
        chapter_context: str = ""
    ) -> Dict[int, str]:
        """
        Detect roles for paragraphs using Qwen3-8B.
        Phát hiện vai diễn cho paragraphs sử dụng Qwen3-8B.
        
        Uses full chapter context for better accuracy.
        Sử dụng full chapter context để độ chính xác tốt hơn.
        """
        # Build classification prompt
        prompt = self._build_role_classification_prompt(paragraphs, chapter_context)
        
        # Call Ollama
        response_text = self._call_ollama(prompt)
        
        # Parse response
        role_map = self._parse_role_response(response_text, len(paragraphs))
        
        return role_map
    
    def _build_role_classification_prompt(
        self,
        paragraphs: List[str],
        chapter_context: str = ""
    ) -> str:
        """Build prompt for role classification / Xây dựng prompt cho role classification"""
        
        paragraphs_text = "\n".join([
            f"{i+1}. {para[:200]}..." if len(para) > 200 else f"{i+1}. {para}"
            for i, para in enumerate(paragraphs)
        ])
        
        prompt = f"""Bạn là hệ thống phân loại vai diễn cho tiểu thuyết tiếng Việt.

Nhiệm vụ: Phân loại mỗi đoạn văn sau thành một trong ba loại:
- narrator: Văn bản dẫn chuyện, mô tả, tường thuật của tác giả (không có đối thoại trực tiếp)
- male: Lời nói, suy nghĩ, hoặc hành động của nhân vật nam
- female: Lời nói, suy nghĩ, hoặc hành động của nhân vật nữ

Ngữ cảnh chapter (để tham khảo, phân tích xem ai đang nói):
{chapter_context[:3000] if chapter_context else "Không có ngữ cảnh"}...

Danh sách đoạn văn cần phân loại (mỗi đoạn trên một dòng, đánh số):
{paragraphs_text}

Yêu cầu:
1. Phân tích từng đoạn văn dựa trên ngữ cảnh
2. Xác định xem đoạn văn là dẫn chuyện hay lời/suy nghĩ/hành động nhân vật
3. Nếu là nhân vật, xác định giới tính (nam/nữ) từ ngữ cảnh, đại từ, tên nhân vật
4. Trả lời DẠNG JSON duy nhất, không có giải thích thêm

Định dạng trả lời (JSON):
{{"1": "narrator", "2": "male", "3": "female", "4": "narrator", ...}}

Chỉ trả lời JSON, không có văn bản khác."""
        
        return prompt
    
    def _select_voice_ids(
        self,
        paragraphs: List[str],
        role_map: Dict[int, str],
        chapter_context: str = ""
    ) -> Dict[int, str]:
        """
        Select voice IDs based on detected roles.
        Chọn voice IDs dựa trên vai diễn đã phát hiện.
        
        For now, uses default mapping. Can be enhanced with LLM selection.
        Hiện tại, dùng default mapping. Có thể cải thiện với LLM selection.
        """
        voice_map = {}
        
        for idx, role in role_map.items():
            # Use recommended voice for role
            voice_id = get_recommended_voice(role)
            voice_map[idx] = voice_id
        
        return voice_map
    
    def _call_ollama(self, prompt: str, max_tokens: int = 1000, temperature: float = 0.1) -> str:
        """
        Call Ollama API / Gọi Ollama API
        
        Args:
            prompt: Prompt text
            max_tokens: Maximum tokens to generate
            temperature: Temperature for generation (low = more deterministic)
            
        Returns:
            Response text
        """
        try:
            response = requests.post(
                self.api_url,
                json={
                    'model': self.model_name,
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': temperature,
                        'num_predict': max_tokens,
                    },
                    'format': 'json'  # Request JSON format
                },
                timeout=120  # 2 minute timeout
            )
            response.raise_for_status()
            result = response.json()
            return result.get('response', '')
        except requests.exceptions.RequestException as e:
            raise Exception(f"Ollama API error: {e}")
    
    def _parse_role_response(self, response: str, num_paragraphs: int) -> Dict[int, str]:
        """
        Parse JSON response from Qwen3 / Parse JSON response từ Qwen3
        
        Args:
            response: Response text from Ollama
            num_paragraphs: Number of paragraphs expected
            
        Returns:
            Dict mapping paragraph index to role
        """
        try:
            # Clean response
            response = response.strip()
            
            # Remove markdown code blocks if present
            if '```' in response:
                # Extract JSON from code block
                start = response.find('{')
                end = response.rfind('}') + 1
                if start != -1 and end > 0:
                    response = response[start:end]
            
            # Find JSON object
            start = response.find('{')
            end = response.rfind('}') + 1
            
            if start == -1 or end == 0:
                raise ValueError("No JSON found in response")
            
            json_str = response[start:end]
            role_map_raw = json.loads(json_str)
            
            # Convert string keys to int and validate
            result = {}
            for key, value in role_map_raw.items():
                try:
                    idx = int(key) - 1  # Convert 1-based to 0-based
                    if 0 <= idx < num_paragraphs:
                        role = value.lower().strip()
                        if role in ['narrator', 'male', 'female']:
                            result[idx] = role
                        else:
                            result[idx] = 'narrator'  # Default fallback
                except (ValueError, TypeError):
                    continue
            
            # Fill missing indices with narrator
            for i in range(num_paragraphs):
                if i not in result:
                    result[i] = 'narrator'
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing error: {e}")
            print(f"Response: {response[:500]}")
            # Fallback: return all narrator
            return {i: 'narrator' for i in range(num_paragraphs)}


# Test function / Hàm Test
if __name__ == "__main__":
    # Test role detection
    # Test phát hiện vai diễn
    service = RoleDetectionService()
    
    test_paragraphs = [
        "Đây là đoạn dẫn chuyện của tác giả.",
        'Anh ấy nói: "Xin chào, tôi là nam giới."',
        "Cô ấy đáp lại một cách nhẹ nhàng."
    ]
    
    result = service.detect_roles(test_paragraphs)
    print("Role Map:", result["role_map"])
    print("Voice Map:", result["voice_map"])

