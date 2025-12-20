# Unit Testing Guide
# Hướng Dẫn Kiểm Tra Đơn Vị

## 🧪 Test Setup / Thiết Lập Kiểm Tra

### Installation / Cài Đặt

```bash
cd novel-app/backend
npm install
```

### Running Tests / Chạy Kiểm Tra

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 📋 Test Files / File Kiểm Tra

### 1. Enhanced Voice Mapping Tests
**File:** `src/utils/__tests__/enhancedVoiceMapping.test.js`

**Coverage:**
- ✅ Role normalization (backward compatibility)
- ✅ Voice assignment per model (VietTTS, VieNeu-TTS, Coqui XTTS-v2)
- ✅ Automatic round-robin assignment
- ✅ Voice reuse logic
- ✅ Novel-specific mapping
- ✅ Assignment strategy

### 2. Role Detection Service Tests
**File:** `src/services/__tests__/roleDetectionService.test.js`

**Coverage:**
- ✅ Enhanced prompt generation
- ✅ Multiple character support
- ✅ Role parsing (old and new formats)
- ✅ Backward compatibility

### 3. TTS Config Tests
**File:** `src/config/__tests__/ttsConfig.test.js`

**Coverage:**
- ✅ Backend configuration
- ✅ Coqui XTTS-v2 integration
- ✅ Voice mapping between backends
- ✅ Default backend selection

### 4. TTS Service Tests
**File:** `src/services/__tests__/ttsService.test.js`

**Coverage:**
- ✅ Coqui XTTS-v2 API requests
- ✅ Speaker parameter handling
- ✅ Language parameter support
- ✅ Request body building

### 5. Novel Voice Mapping Model Tests
**File:** `src/models/__tests__/NovelVoiceMapping.test.js`

**Coverage:**
- ✅ Database operations
- ✅ CRUD operations
- ✅ Assignment strategy management

### 6. Worker Service Tests
**File:** `src/services/__tests__/worker.test.js`

**Coverage:**
- ✅ Voice selection logic
- ✅ Enhanced voice mapping integration
- ✅ Multiple character support
- ✅ Backward compatibility

### 7. Legacy Voice Mapping Tests
**File:** `src/utils/__tests__/voiceMapping.test.js`

**Coverage:**
- ✅ Backward compatibility
- ✅ Legacy 3-role system
- ✅ Migration path

---

## 🎯 Test Coverage Goals / Mục Tiêu Phủ Sóng

### Core Functionality / Chức Năng Cốt Lõi
- ✅ Role normalization
- ✅ Voice assignment
- ✅ Per-model configuration
- ✅ Novel-specific mapping

### Backward Compatibility / Tương Thích Ngược
- ✅ Old 3-role system
- ✅ Legacy voice mapping
- ✅ Migration path

### Coqui XTTS-v2 Integration / Tích hợp Coqui XTTS-v2
- ✅ Backend configuration
- ✅ API request building
- ✅ Speaker selection
- ✅ Language support

---

## 📝 Writing New Tests / Viết Kiểm Tra Mới

### Test Structure / Cấu Trúc Kiểm Tra

```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
  let instance;

  beforeEach(() => {
    instance = new Feature();
  });

  describe('methodName', () => {
    it('should do something', () => {
      const result = instance.methodName();
      expect(result).toBe(expected);
    });
  });
});
```

### Best Practices / Thực Hành Tốt

1. **Isolation:** Each test should be independent
2. **Clear Names:** Use descriptive test names
3. **Coverage:** Test both success and failure cases
4. **Mocking:** Mock external dependencies
5. **Edge Cases:** Test boundary conditions

---

## 🚀 Running Specific Tests / Chạy Kiểm Tra Cụ Thể

```bash
# Run specific test file
npm test src/utils/__tests__/enhancedVoiceMapping.test.js

# Run tests matching pattern
npm test -- --grep "EnhancedVoiceMapping"

# Run tests with verbose output
npm test -- --reporter=verbose
```

---

## 📊 Coverage Report / Báo Cáo Phủ Sóng

After running `npm run test:coverage`, check:
- `coverage/index.html` - HTML coverage report
- `coverage/coverage-summary.json` - JSON summary

**Target Coverage:** 80%+

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Test Suite Created

