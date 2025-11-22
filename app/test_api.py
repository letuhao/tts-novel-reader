"""
Test TTS Backend API
Kiểm tra API TTS Backend

Tests the TTS backend API to verify headers are returned correctly.
Kiểm tra API TTS backend để xác minh headers được trả về đúng cách.
"""
import json
import urllib.request
import urllib.error
import sys

def test_tts_api():
    """Test TTS API / Kiểm tra API TTS"""
    print("=" * 60)
    print("Testing TTS Backend API")
    print("Kiểm tra API TTS Backend")
    print("=" * 60)
    print()
    
    # Test request body
    request_body = {
        "text": "[05] Xin chào, đây là test paragraph để kiểm tra TTS backend.",
        "model": "dia",
        "store": True,
        "expiry_hours": 2,
        "return_audio": False,
        "speed_factor": 1.0
    }
    
    print("Request:")
    print(f"  Text: {request_body['text']}")
    print(f"  Model: {request_body['model']}")
    print(f"  Store: {request_body['store']}")
    print(f"  Return audio: {request_body['return_audio']}")
    print()
    
    # Prepare request
    url = "http://127.0.0.1:8000/api/tts/synthesize"
    data = json.dumps(request_body).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    print("Sending request...")
    print("Đang gửi yêu cầu...")
    print()
    
    try:
        # Send request
        with urllib.request.urlopen(req, timeout=60) as response:
            print("✅ SUCCESS! Response received!")
            print("✅ THÀNH CÔNG! Đã nhận phản hồi!")
            print()
            
            # Get response details
            print("Response Details:")
            print("Chi tiết phản hồi:")
            print(f"  Status Code: {response.status}")
            print(f"  Status: {response.reason}")
            print()
            
            # Get headers
            print("📋 Headers:")
            print("📋 Tiêu đề:")
            headers_dict = dict(response.headers.items())
            file_id_header = None
            request_id_header = None
            expires_at_header = None
            
            for key, value in headers_dict.items():
                if key.lower().startswith('x-'):
                    print(f"    {key}: {value} ✅ FOUND")
                    if key.lower() == 'x-file-id':
                        file_id_header = value
                    elif key.lower() == 'x-request-id':
                        request_id_header = value
                    elif key.lower() == 'x-expires-at':
                        expires_at_header = value
                else:
                    print(f"    {key}: {value}")
            print()
            
            # Get response body
            body_str = response.read().decode('utf-8')
            body_data = json.loads(body_str)
            
            print("📄 Response Body:")
            print("📄 Nội dung phản hồi:")
            print(json.dumps(body_data, indent=2, ensure_ascii=False))
            print()
            
            # Extract file ID from body
            file_id_body = None
            expires_at_body = None
            request_id_body = None
            
            if 'file_metadata' in body_data and body_data['file_metadata']:
                file_id_body = body_data['file_metadata'].get('file_id')
                expires_at_body = body_data['file_metadata'].get('expires_at')
            
            if 'request_id' in body_data:
                request_id_body = body_data['request_id']
            
            # Compare headers and body
            print("🔍 Verification:")
            print("🔍 Xác minh:")
            print()
            
            print(f"File ID from headers: {file_id_header or 'NOT FOUND ❌'}")
            print(f"File ID from body: {file_id_body or 'NOT FOUND ❌'}")
            
            if file_id_header and file_id_body:
                if file_id_header == file_id_body:
                    print("✅ File IDs match! Headers fix is working!")
                    print("✅ File ID khớp! Fix headers đang hoạt động!")
                else:
                    print("⚠️  File IDs don't match!")
                    print("⚠️  File ID không khớp!")
            elif file_id_header:
                print("✅ File ID found in headers (body may not have it)")
                print("✅ File ID tìm thấy trong headers (body có thể không có)")
            elif file_id_body:
                print("⚠️  File ID only in body, not in headers")
                print("⚠️  File ID chỉ có trong body, không có trong headers")
            else:
                print("❌ File ID not found in either headers or body!")
                print("❌ File ID không tìm thấy trong headers hoặc body!")
            
            print()
            
            if request_id_header:
                print(f"Request ID from headers: {request_id_header} ✅")
            if expires_at_header:
                print(f"Expires At from headers: {expires_at_header} ✅")
            
            print()
            print("=" * 60)
            if file_id_header:
                print("✅ TEST PASSED: Headers are being returned correctly!")
                print("✅ KIỂM TRA THÀNH CÔNG: Headers đang được trả về đúng cách!")
            else:
                print("❌ TEST FAILED: Headers are missing!")
                print("❌ KIỂM TRA THẤT BẠI: Headers bị thiếu!")
            print("=" * 60)
            
            return file_id_header is not None
            
    except urllib.error.HTTPError as e:
        print("❌ HTTP ERROR occurred!")
        print("❌ Đã xảy ra LỖI HTTP!")
        print(f"   Status Code: {e.code}")
        print(f"   Reason: {e.reason}")
        print()
        
        try:
            error_body = e.read().decode('utf-8')
            print("Error Response Body:")
            print("Nội dung phản hồi lỗi:")
            print(error_body)
        except:
            print("Could not read error response body")
            print("Không thể đọc nội dung phản hồi lỗi")
        
        print()
        print("=" * 60)
        print("❌ TEST FAILED: HTTP Error")
        print("❌ KIỂM TRA THẤT BẠI: Lỗi HTTP")
        print("=" * 60)
        return False
        
    except urllib.error.URLError as e:
        print("❌ URL ERROR occurred!")
        print("❌ Đã xảy ra LỖI URL!")
        print(f"   Error: {e.reason}")
        print()
        print("Is the TTS backend running?")
        print("TTS backend có đang chạy không?")
        print("Try: python restart_backend.py")
        print()
        print("=" * 60)
        print("❌ TEST FAILED: Connection Error")
        print("❌ KIỂM TRA THẤT BẠI: Lỗi kết nối")
        print("=" * 60)
        return False
        
    except Exception as e:
        print("❌ ERROR occurred!")
        print("❌ Đã xảy ra LỖI!")
        print(f"   Error: {str(e)}")
        import traceback
        traceback.print_exc()
        print()
        print("=" * 60)
        print("❌ TEST FAILED: Unexpected Error")
        print("❌ KIỂM TRA THẤT BẠI: Lỗi không mong đợi")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = test_tts_api()
    sys.exit(0 if success else 1)

