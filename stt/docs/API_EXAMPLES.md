# API Examples

Code examples for using the STT backend API in various languages and scenarios.

## Table of Contents

- [PowerShell Examples](#powershell-examples)
- [Python Examples](#python-examples)
- [JavaScript/TypeScript Examples](#javascripttypescript-examples)
- [cURL Examples](#curl-examples)
- [Advanced Examples](#advanced-examples)

---

## PowerShell Examples

### Basic Transcription

```powershell
# Simple transcription
$formData = @{
    audio = Get-Item "test_audio.wav"
}
$result = Invoke-RestMethod -Uri "http://localhost:11210/api/stt/transcribe?language=en" -Method Post -Form $formData
Write-Host $result.data.text
```

### With Word Timestamps

```powershell
$formData = @{
    audio = Get-Item "test_audio.wav"
}
$result = Invoke-RestMethod -Uri "http://localhost:11210/api/stt/transcribe?language=en&word_timestamps=true" -Method Post -Form $formData

# Display segments with word timestamps
foreach ($segment in $result.data.segments) {
    Write-Host "Segment: $($segment.text)"
    if ($segment.words) {
        foreach ($word in $segment.words) {
            Write-Host "  $($word.word): $($word.start)s - $($word.end)s"
        }
    }
}
```

### Auto-detect Language

```powershell
$formData = @{
    audio = Get-Item "test_audio.wav"
}
$result = Invoke-RestMethod -Uri "http://localhost:11210/api/stt/transcribe?language=auto" -Method Post -Form $formData
Write-Host "Detected language: $($result.data.language)"
Write-Host "Confidence: $($result.data.language_probability)"
Write-Host "Text: $($result.data.text)"
```

### Translate to English

```powershell
$formData = @{
    audio = Get-Item "spanish_audio.wav"
}
$result = Invoke-RestMethod -Uri "http://localhost:11210/api/stt/transcribe?language=es&task=translate" -Method Post -Form $formData
Write-Host "Translation: $($result.data.text)"
```

---

## Python Examples

### Basic Transcription

```python
import requests

def transcribe_audio(audio_path, language="en"):
    """Transcribe an audio file"""
    with open(audio_path, "rb") as f:
        files = {"audio": f}
        params = {"language": language}
        response = requests.post(
            "http://localhost:11210/api/stt/transcribe",
            files=files,
            params=params
        )
        response.raise_for_status()
        return response.json()

# Usage
result = transcribe_audio("test_audio.wav", language="en")
print(result["data"]["text"])
```

### With Error Handling

```python
import requests
from requests.exceptions import RequestException

def transcribe_audio_safe(audio_path, language="en"):
    """Transcribe audio with error handling"""
    try:
        with open(audio_path, "rb") as f:
            files = {"audio": f}
            params = {"language": language, "vad_filter": True}
            response = requests.post(
                "http://localhost:11210/api/stt/transcribe",
                files=files,
                params=params,
                timeout=300  # 5 minutes timeout
            )
            response.raise_for_status()
            return response.json()
    except FileNotFoundError:
        print(f"Audio file not found: {audio_path}")
        return None
    except RequestException as e:
        print(f"Request failed: {e}")
        return None

# Usage
result = transcribe_audio_safe("test_audio.wav")
if result and result.get("success"):
    print(result["data"]["text"])
```

### Batch Transcription

```python
import requests
from pathlib import Path

def transcribe_batch(audio_files, language="en"):
    """Transcribe multiple audio files"""
    results = []
    for audio_file in audio_files:
        print(f"Transcribing {audio_file}...")
        with open(audio_file, "rb") as f:
            files = {"audio": f}
            params = {"language": language}
            response = requests.post(
                "http://localhost:11210/api/stt/transcribe",
                files=files,
                params=params
            )
            if response.status_code == 200:
                result = response.json()
                results.append({
                    "file": audio_file,
                    "text": result["data"]["text"],
                    "language": result["data"]["language"]
                })
            else:
                print(f"Failed to transcribe {audio_file}")
    return results

# Usage
audio_files = ["audio1.wav", "audio2.wav", "audio3.wav"]
results = transcribe_batch(audio_files)
for result in results:
    print(f"{result['file']}: {result['text']}")
```

### With Segments and Timestamps

```python
import requests

def transcribe_with_segments(audio_path):
    """Get transcription with segment timestamps"""
    with open(audio_path, "rb") as f:
        files = {"audio": f}
        params = {
            "language": "en",
            "return_timestamps": True,
            "vad_filter": True
        }
        response = requests.post(
            "http://localhost:11210/api/stt/transcribe",
            files=files,
            params=params
        )
        result = response.json()
        
        print(f"Full text: {result['data']['text']}")
        print(f"Language: {result['data']['language']}")
        print("\nSegments:")
        for segment in result['data']['segments']:
            print(f"  [{segment['start']:.2f}s - {segment['end']:.2f}s] {segment['text']}")

# Usage
transcribe_with_segments("test_audio.wav")
```

---

## JavaScript/TypeScript Examples

### Basic Transcription (Browser)

```javascript
async function transcribeAudio(audioFile, language = 'en') {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    const url = new URL('http://localhost:11210/api/stt/transcribe');
    url.searchParams.append('language', language);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result.data.text;
    } catch (error) {
        console.error('Transcription failed:', error);
        throw error;
    }
}

// Usage
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const text = await transcribeAudio(file, 'en');
        console.log('Transcription:', text);
    }
});
```

### Node.js Example

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function transcribeAudio(audioPath, language = 'en') {
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(audioPath));
    
    try {
        const response = await axios.post(
            `http://localhost:11210/api/stt/transcribe?language=${language}`,
            formData,
            {
                headers: formData.getHeaders()
            }
        );
        
        return response.data.data.text;
    } catch (error) {
        console.error('Transcription failed:', error);
        throw error;
    }
}

// Usage
transcribeAudio('test_audio.wav', 'en')
    .then(text => console.log('Transcription:', text))
    .catch(error => console.error('Error:', error));
```

---

## cURL Examples

### Basic Transcription

```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=en" \
  -F "audio=@test_audio.wav"
```

### With All Parameters

```bash
curl -X POST "http://localhost:11210/api/stt/transcribe" \
  -F "audio=@test_audio.wav" \
  -F "language=en" \
  -F "task=transcribe" \
  -F "beam_size=5" \
  -F "vad_filter=true" \
  -F "return_timestamps=true" \
  -F "word_timestamps=false"
```

### Auto-detect Language

```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=auto" \
  -F "audio=@test_audio.wav"
```

### Translate to English

```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=es&task=translate" \
  -F "audio=@spanish_audio.wav"
```

### Save Response to File

```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=en" \
  -F "audio=@test_audio.wav" \
  -o transcription.json
```

---

## Advanced Examples

### Real-time Transcription (Chunked)

```python
import requests
import time
from pathlib import Path

def transcribe_chunks(audio_path, chunk_duration=30):
    """Transcribe long audio in chunks"""
    # This is a simplified example
    # In production, you'd split the audio file into chunks
    
    chunks = split_audio_into_chunks(audio_path, chunk_duration)
    results = []
    
    for i, chunk_path in enumerate(chunks):
        print(f"Transcribing chunk {i+1}/{len(chunks)}...")
        with open(chunk_path, "rb") as f:
            files = {"audio": f}
            params = {
                "language": "en",
                "vad_filter": True
            }
            response = requests.post(
                "http://localhost:11210/api/stt/transcribe",
                files=files,
                params=params
            )
            result = response.json()
            results.append(result["data"])
        
        # Clean up chunk file
        Path(chunk_path).unlink()
    
    # Combine results
    full_text = " ".join([r["text"] for r in results])
    return full_text
```

### Health Check Monitoring

```python
import requests
import time

def monitor_service():
    """Monitor STT service health"""
    while True:
        try:
            response = requests.get("http://localhost:11210/health", timeout=5)
            if response.status_code == 200:
                status = response.json()
                print(f"✅ Service healthy: {status['model']}")
            else:
                print(f"⚠️ Service unhealthy: {response.status_code}")
        except Exception as e:
            print(f"❌ Service unavailable: {e}")
        
        time.sleep(60)  # Check every minute
```

---

## See Also

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Response Formats](./RESPONSE_FORMATS.md) - Response structure details
- [Integration Guide](./INTEGRATION.md) - Integration patterns

