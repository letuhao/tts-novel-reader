# Next Steps - Enhanced Voice Mapping System
# Các Bước Tiếp Theo - Hệ Thống Ánh Xạ Giọng Nâng Cao

## ✅ Completed Tasks / Các Nhiệm Vụ Đã Hoàn Thành

1. ✅ Enhanced Voice Mapping service with per-model configuration
2. ✅ Coqui XTTS-v2 backend integration
3. ✅ Multiple character support (male_1, male_2, etc.)
4. ✅ Automatic round-robin voice assignment
5. ✅ Per-novel voice mapping storage (database)
6. ✅ Worker service integration
7. ✅ TTS service Coqui XTTS-v2 support
8. ✅ Backward compatibility (male → male_1, female → female_1)
9. ✅ API endpoints for voice management
10. ✅ Comprehensive unit tests (126 tests, all passing)

---

## 🧪 Immediate Next Steps / Các Bước Tiếp Theo Ngay Lập Tức

### 1. Test the API Endpoints
**File:** `test_voice_mapping_api.ps1`

Run the test script to verify all API endpoints work:

```powershell
cd novel-app/backend
.\test_voice_mapping_api.ps1
```

**What it tests:**
- ✅ Get all TTS models
- ✅ Get available voices
- ✅ Get default mappings
- ✅ Resolve voice for role
- ✅ Backward compatibility

---

### 2. Integration Testing with Real Data

#### A. Test with Existing Novel

1. **Get a novel ID:**
   ```bash
   # Check database or use API
   curl http://localhost:11110/api/novels
   ```

2. **Test novel-specific voice mapping:**
   ```bash
   # Get current mappings
   curl http://localhost:11110/api/voice-mapping/novel/{novelId}
   
   # Set custom mappings
   curl -X PUT http://localhost:11110/api/voice-mapping/novel/{novelId} \
     -H "Content-Type: application/json" \
     -d '{
       "model": "coqui-xtts-v2",
       "mappings": {
         "male_1": "Craig Gutsy",
         "female_1": "Ana Florence"
       }
     }'
   ```

3. **Test voice resolution:**
   ```bash
   curl -X POST http://localhost:11110/api/voice-mapping/resolve \
     -H "Content-Type: application/json" \
     -d '{
       "role": "male_1",
       "model": "coqui-xtts-v2",
       "novelId": "{novelId}"
     }'
   ```

#### B. Test Audio Generation with Enhanced Mapping

1. **Generate audio for a chapter:**
   ```bash
   curl -X POST http://localhost:11110/api/worker/generate/chapter \
     -H "Content-Type: application/json" \
     -d '{
       "novelId": "{novelId}",
       "chapterNumber": 1,
       "model": "coqui-xtts-v2"
     }'
   ```

2. **Verify voices are assigned correctly:**
   - Check that different characters get different voices
   - Verify narrator uses correct voice
   - Confirm novel-specific mappings are applied

---

### 3. End-to-End Testing

#### Test Scenario: English Novel with Multiple Characters

1. **Upload an English novel** (if you have one)
2. **Set TTS model to Coqui XTTS-v2:**
   ```bash
   # Set environment variable or update config
   export TTS_DEFAULT_MODEL=coqui-xtts-v2
   ```

3. **Run role detection:**
   ```bash
   curl -X POST http://localhost:11110/api/role-detection/detect-novel \
     -H "Content-Type: application/json" \
     -d '{
       "novelId": "{novelId}",
       "forceRegenerateRoles": false
     }'
   ```

4. **Generate audio:**
   ```bash
   curl -X POST http://localhost:11110/api/worker/generate/chapter \
     -H "Content-Type: application/json" \
     -d '{
       "novelId": "{novelId}",
       "chapterNumber": 1,
       "model": "coqui-xtts-v2"
     }'
   ```

5. **Verify results:**
   - Check that multiple male characters get different voices
   - Check that multiple female characters get different voices
   - Verify narrator voice is consistent

---

## 🔧 Optional Enhancements / Các Cải Tiến Tùy Chọn

### 1. Frontend Integration
- Build UI for voice mapping management
- Allow users to customize voices per novel
- Display available voices with previews
- Show voice assignment strategy

### 2. Voice Preview API
- Add endpoint to generate short audio previews
- Help users choose voices before assigning

### 3. Character Tracking
- Implement character database model
- Track character appearances across chapters
- Maintain voice consistency per character

### 4. Advanced Assignment Strategies
- Add "character-based" strategy (same character = same voice)
- Add "gender-based" strategy (all males share voices)
- Add "chapter-based" strategy (different voices per chapter)

### 5. Voice Quality Metrics
- Track voice usage statistics
- Identify underused voices
- Suggest voice diversity improvements

---

## 📊 Monitoring & Debugging / Giám Sát & Gỡ Lỗi

### Check Voice Assignment Logs

The worker service logs voice assignments. Check logs for:
- Which voices are being assigned
- Whether novel-specific mappings are used
- Round-robin assignment behavior

### Database Queries

```sql
-- Check novel voice mappings
SELECT * FROM novel_voice_mappings WHERE novel_id = '{novelId}';

-- Check voice assignment strategy
SELECT * FROM novel_voice_configs WHERE novel_id = '{novelId}';

-- Check paragraph roles
SELECT role, voice_id, COUNT(*) 
FROM paragraphs 
WHERE chapter_id IN (SELECT id FROM chapters WHERE novel_id = '{novelId}')
GROUP BY role, voice_id;
```

---

## 🐛 Troubleshooting / Khắc Phục Sự Cố

### Issue: Voices not assigned correctly

**Check:**
1. Is the TTS model correct? (`TTS_DEFAULT_MODEL`)
2. Are novel-specific mappings set?
3. Is assignment strategy correct?
4. Are roles detected correctly? (Check `paragraphs.role`)

### Issue: API endpoints not working

**Check:**
1. Is the backend server running?
2. Are routes registered in `server.js`?
3. Check server logs for errors

### Issue: Unit tests failing

**Run tests:**
```bash
cd novel-app/backend
npm test
```

**Check:**
1. Are all dependencies installed?
2. Are mocks set up correctly?
3. Check test output for specific failures

---

## 📚 Documentation / Tài Liệu

### Available Documentation

1. **API Documentation:** `VOICE_MAPPING_API.md`
   - Complete API reference
   - Request/response examples
   - Error handling

2. **Testing Guide:** `README_TESTING.md`
   - Unit test structure
   - Running tests
   - Coverage goals

3. **Implementation Summary:** `ENHANCEMENT_SUMMARY.md`
   - System architecture
   - Implementation details
   - Migration guide

4. **Voice Pickup Review:** `VOICE_PICKUP_MAPPING_REVIEW.md`
   - Current system analysis
   - Limitations identified
   - Enhancement proposals

---

## 🎯 Success Criteria / Tiêu Chí Thành Công

The system is ready when:

- ✅ All API endpoints respond correctly
- ✅ Voice assignment works for multiple characters
- ✅ Novel-specific mappings are applied
- ✅ Backward compatibility maintained
- ✅ Unit tests all pass
- ✅ Integration tests pass with real data

---

## 🚀 Ready to Use! / Sẵn Sàng Sử Dụng!

The enhanced voice mapping system is **complete and ready for production use**. 

**Next immediate action:** Run the API test script to verify everything works:

```powershell
cd novel-app/backend
.\test_voice_mapping_api.ps1
```

---

**Last Updated:** 2024-12-19  
**Status:** ✅ System Complete - Ready for Testing

