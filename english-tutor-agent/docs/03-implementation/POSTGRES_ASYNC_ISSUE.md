# PostgresSaver Async Methods Issue
## Vấn đề với PostgresSaver Async Methods

**Date:** 2025-12-22  
**Status:** ⚠️ Known Issue

---

## 🔍 Vấn đề

`PostgresSaver` từ `langgraph-checkpoint-postgres` (version 3.0.2) có các async methods nhưng chúng **chưa được implement**, chỉ raise `NotImplementedError`.

**Error:**
```
NotImplementedError
File ".../langgraph/checkpoint/base/__init__.py", line 271, in aget_tuple
    raise NotImplementedError
```

---

## 🔍 Root Cause

Khi inspect source code:
```python
async def aget_tuple(self, config: RunnableConfig) -> CheckpointTuple | None:
    """Asynchronously fetch a checkpoint tuple..."""
    raise NotImplementedError
```

Method `aget_tuple()` chỉ có stub implementation, chưa được implement thực sự.

---

## ✅ Giải pháp

### Option 1: Use MemorySaver for Development/Tests (Recommended)

**Cho development và tests**, dùng `MemorySaver`:

```python
from langgraph.checkpoint.memory import MemorySaver

app = build_workflow(use_memory_for_tests=True)
```

**Pros:**
- ✅ Đơn giản, không cần database
- ✅ Phù hợp cho tests
- ✅ Không có async issues

**Cons:**
- ❌ State không persist (mất khi restart)
- ❌ Không phù hợp cho production

---

### Option 2: Wait for Library Update

Có thể library sẽ được update trong tương lai để implement async methods.

**Version hiện tại:** `langgraph-checkpoint-postgres==3.0.2`

**Check for updates:**
```bash
pip install --upgrade langgraph-checkpoint-postgres
```

---

### Option 3: Use Sync Methods (If Available)

Nếu PostgresSaver có sync methods (`get_tuple` instead of `aget_tuple`), có thể LangGraph sẽ tự động wrap them. Nhưng hiện tại async workflow vẫn gọi async methods.

---

## 📊 Current Status

### PostgresSaver Methods

| Method | Type | Status |
|--------|------|--------|
| `get_tuple()` | Sync | ✅ Implemented |
| `aget_tuple()` | Async | ❌ Not Implemented (raises NotImplementedError) |
| `get()` | Sync | ✅ Implemented |
| `aget()` | Async | ❌ Not Implemented (likely) |

### Workaround

**Use MemorySaver for tests:**

```python
# In test scripts
app = build_workflow(use_memory_for_tests=True)

# In production/main app
app = build_workflow(use_memory_for_tests=False)  # Will use PostgresSaver if DATABASE_URL is set
```

---

## 🔧 Implementation

### Current Implementation

File: `src/workflows/tutor_workflow.py`

```python
def build_workflow(checkpointer=None, router_mode: str = None, use_memory_for_tests: bool = False):
    # ...
    if checkpointer is None:
        checkpointer = get_checkpointer(force_memory=use_memory_for_tests)
    # ...
```

File: `src/services/checkpointer.py`

```python
def get_checkpointer(force_memory: bool = False):
    # ...
    return create_checkpointer(database_url, force_memory=force_memory)
```

---

## ✅ Recommendation

**For now:**
- ✅ Use `MemorySaver` for **tests** and **development**
- ✅ Use `PostgresSaver` for **production** (when async methods are fixed)
- ⚠️ Monitor library updates

**Usage:**
```python
# Tests
app = build_workflow(use_memory_for_tests=True)

# Production (when ready)
app = build_workflow(use_memory_for_tests=False)
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-22  
**Status:** ⚠️ Workaround in place

