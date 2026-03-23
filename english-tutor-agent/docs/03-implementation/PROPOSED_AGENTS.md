# Proposed Agents - Các Agents Đề Xuất
## Quick Reference cho Implementation

**Date:** 2025-12-23  
**Status:** 📋 Planning

---

## 🔴 High Priority (Implement Ngay)

### 1. Vocabulary Agent

**Status:** ✅ Router intent exists, ❌ Agent missing

**Router Intent:** `"vocabulary"` (đã có)

**Required Changes:**
- Create `src/agents/vocabulary.py`
- Update `tutor_workflow.py` to route "vocabulary" intent → vocabulary agent
- Update router agent_map: `"vocabulary": "vocabulary"` (thay vì "tutor")

**Features:**
- Word definitions và examples
- Synonym/Antonym
- Usage in context
- Vocabulary quizzes
- Word difficulty assessment

**Estimated Time:** 1-2 days

---

### 2. Translation Agent

**Status:** ✅ Router intent exists, ❌ Agent missing

**Router Intent:** `"translation"` (đã có)

**Required Changes:**
- Create `src/agents/translation.py`
- Update `tutor_workflow.py` to route "translation" intent → translation agent
- Update router agent_map: `"translation": "translation"` (thay vì "tutor")

**Features:**
- Context-aware translation
- Multiple translation options
- Explanation of choices
- Cultural context notes
- Bidirectional translation

**Estimated Time:** 1-2 days

---

## 🟡 Medium Priority (Sau Phase 1)

### 3. Writing Agent

**Status:** ❌ Router intent missing, ❌ Agent missing

**Required Changes:**
- Create `src/agents/writing.py`
- Add "writing" intent to router (keywords: "writing", "essay", "composition", "style")
- Update `tutor_workflow.py` to route "writing" intent → writing agent

**Features:**
- Writing quality assessment (beyond grammar)
- Style suggestions
- Coherence analysis
- Structure feedback
- Tone assessment

**Estimated Time:** 2-3 days

---

### 4. Listening Agent (Optional)

**Status:** ❌ Router intent missing, ❌ Agent missing

**Alternative:** Integrate vào Exercise Agent

**Required Changes (if separate agent):**
- Create `src/agents/listening.py`
- Add "listening" intent to router
- Update `tutor_workflow.py`

**Features:**
- Listening comprehension exercises
- Dictation practice
- Audio-based questions

**Estimated Time:** 2-3 days (hoặc 1 day nếu integrate vào Exercise Agent)

---

## 🟢 Low Priority (Future)

### 5. Cultural Context

**Status:** ❌ Not needed as separate agent

**Recommendation:** Integrate vào Tutor/Vocabulary/Translation agents

---

### 6. Progress Tracking

**Status:** ❌ Not needed as agent

**Recommendation:** Implement as service layer/database feature

---

## 📋 Implementation Checklist

### Phase 1 (High Priority)
- [ ] Vocabulary Agent implementation
- [ ] Translation Agent implementation
- [ ] Update workflow routing for vocabulary/translation
- [ ] Update router agent_map
- [ ] Create test scripts
- [ ] Update documentation

### Phase 2 (Medium Priority)
- [ ] Writing Agent implementation
- [ ] Add "writing" intent to router
- [ ] Listening Agent (or integrate into Exercise)
- [ ] Update workflow routing
- [ ] Create test scripts

---

**Total Estimated Time for Phase 1:** 2-4 days  
**Total Estimated Time for Phase 2:** 4-6 days

