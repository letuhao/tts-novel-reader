# LLM Parser Guard Logic - Text Preservation

## Overview / Tổng quan

The LLM parser now includes comprehensive guard logic to ensure **NO TEXT IS LOST** and **TEXT ORDER IS PRESERVED**, even if the LLM structure detection is wrong or incomplete.

LLM parser hiện bao gồm guard logic toàn diện để đảm bảo **KHÔNG MẤT TEXT** và **THỨ TỰ TEXT ĐƯỢC GIỮ NGUYÊN**, ngay cả khi LLM structure detection sai hoặc không hoàn chỉnh.

## Guard Logic Principles / Nguyên tắc Guard Logic

### 1. **Index-Based Extraction** / Trích xuất Dựa trên Index
- Uses exact line indexes from original file
- Sử dụng chính xác line indexes từ file gốc
- Ensures all lines are captured in order
- Đảm bảo tất cả dòng được capture theo thứ tự

### 2. **Gap Detection and Fixing** / Phát hiện và Sửa Gap
- Detects gaps between chapters
- Phát hiện khoảng trống giữa các chapters
- Automatically fixes gaps by adding missing lines to previous chapter
- Tự động sửa gaps bằng cách thêm các dòng thiếu vào chapter trước

### 3. **Overlap Detection** / Phát hiện Overlap
- Detects overlapping chapters
- Phát hiện chapters chồng chéo
- Logs warnings for manual review
- Ghi log cảnh báo để xem xét thủ công

### 4. **Missing End Lines Fixing** / Sửa Missing End Lines
- Detects missing lines at end of file
- Phát hiện các dòng thiếu ở cuối file
- Automatically adds them to last chapter
- Tự động thêm vào chapter cuối

### 5. **Validation** / Xác thực
- Validates total lines covered
- Xác thực tổng số dòng được bao phủ
- Compares expected vs actual lines
- So sánh dòng mong đợi vs thực tế
- Allows tolerance for empty lines and parsing differences
- Cho phép dung sai cho dòng trống và sự khác biệt parsing

## Implementation Details / Chi tiết Triển khai

### Method: `_buildChaptersFromStructureIndex()`

This method implements the same guard logic as the regex parser:

1. **Build Chapter Index** / Xây dựng Chapter Index
   - Creates start/end line indexes for each chapter
   - Tạo start/end line indexes cho mỗi chapter
   - Ensures no gaps in index (first chapter starts at 0, last ends at totalLines)
   - Đảm bảo không có gaps trong index (chapter đầu bắt đầu ở 0, chapter cuối kết thúc ở totalLines)

2. **Validate Indexes** / Xác thực Indexes
   - Checks if indexes are within bounds
   - Kiểm tra indexes có nằm trong giới hạn không
   - Skips invalid markers
   - Bỏ qua markers không hợp lệ

3. **Extract Text by Index** / Trích xuất Text theo Index
   - Uses `lines.slice(startLineIndex, endLineIndex)`
   - Sử dụng `lines.slice(startLineIndex, endLineIndex)`
   - Preserves exact line order
   - Giữ nguyên thứ tự dòng chính xác

4. **Gap Detection** / Phát hiện Gap
   ```javascript
   if (entry.startLineIndex > lastEndIndex) {
     // Gap detected - fix by adding to previous chapter
     // Phát hiện gap - sửa bằng cách thêm vào chapter trước
   }
   ```

5. **Missing End Lines Detection** / Phát hiện Missing End Lines
   ```javascript
   if (lastEndIndex < totalLines) {
     // Missing end lines - fix by adding to last chapter
     // Thiếu dòng cuối - sửa bằng cách thêm vào chapter cuối
   }
   ```

6. **Validation** / Xác thực
   ```javascript
   const totalLinesInChapters = chapters.reduce((sum, ch) => sum + ch.totalLines, 0);
   const expectedContentLines = totalLinesInFile - chapterHeaderLines;
   const tolerance = Math.max(10, Math.floor(expectedContentLines * 0.05));
   
   if (totalLinesInChapters < expectedContentLines - tolerance) {
     // Potential text loss detected
     // Phát hiện có thể mất text
   }
   ```

## Text Preservation Guarantees / Đảm bảo Giữ Text

### ✅ All Lines Preserved / Tất cả Dòng được Giữ
- Every line from the original file is included in at least one chapter
- Mỗi dòng từ file gốc được bao gồm trong ít nhất một chapter

### ✅ Text Order Preserved / Thứ tự Text được Giữ
- Lines are extracted in the same order as the original file
- Các dòng được trích xuất theo cùng thứ tự như file gốc

### ✅ No Text Loss Even if Structure Detection is Wrong / Không Mất Text Ngay cả khi Structure Detection Sai
- Gaps are automatically fixed by adding missing lines to previous chapter
- Gaps được tự động sửa bằng cách thêm các dòng thiếu vào chapter trước
- Missing end lines are automatically added to last chapter
- Missing end lines được tự động thêm vào chapter cuối

### ✅ Empty Lines Preserved / Dòng Trống được Giữ
- Empty lines are preserved as paragraph breaks
- Các dòng trống được giữ như paragraph breaks
- Even if structure detection misses them, they're included
- Ngay cả khi structure detection bỏ lỡ chúng, chúng vẫn được bao gồm

## Comparison with Regex Parser / So sánh với Regex Parser

| Feature | Regex Parser | LLM Parser |
|---------|--------------|------------|
| Index-based extraction | ✅ | ✅ |
| Gap detection | ✅ | ✅ |
| Gap fixing | ❌ (logs only) | ✅ (auto-fix) |
| Overlap detection | ✅ | ✅ |
| Missing end lines detection | ✅ | ✅ |
| Missing end lines fixing | ❌ (logs only) | ✅ (auto-fix) |
| Validation | ✅ | ✅ |
| Text order preservation | ✅ | ✅ |

**Note**: The LLM parser has **enhanced** guard logic compared to the regex parser - it not only detects issues but also **automatically fixes** them to ensure no text is lost.

**Lưu ý**: LLM parser có guard logic **nâng cao** hơn so với regex parser - nó không chỉ phát hiện vấn đề mà còn **tự động sửa** chúng để đảm bảo không mất text.

## Error Handling / Xử lý Lỗi

### Fallback Behavior / Hành vi Dự phòng

1. **If LLM unavailable** / Nếu LLM không khả dụng
   - Falls back to regex parser
   - Dự phòng sang regex parser

2. **If no markers detected** / Nếu không phát hiện markers
   - Treats entire content as single chapter
   - Xử lý toàn bộ nội dung như một chapter

3. **If invalid markers** / Nếu markers không hợp lệ
   - Skips invalid markers
   - Bỏ qua markers không hợp lệ
   - Falls back to single chapter if all markers invalid
   - Dự phòng sang single chapter nếu tất cả markers không hợp lệ

4. **If gaps detected** / Nếu phát hiện gaps
   - Automatically fixes by adding missing lines to previous chapter
   - Tự động sửa bằng cách thêm các dòng thiếu vào chapter trước

5. **If missing end lines** / Nếu thiếu dòng cuối
   - Automatically fixes by adding to last chapter
   - Tự động sửa bằng cách thêm vào chapter cuối

## Testing / Kiểm thử

### Test Cases / Các Trường hợp Kiểm thử

1. **Perfect Structure Detection** / Phát hiện Cấu trúc Hoàn hảo
   - All markers correct
   - Tất cả markers đúng
   - No gaps, no overlaps
   - Không có gaps, không có overlaps
   - ✅ Should work perfectly
   - ✅ Nên hoạt động hoàn hảo

2. **Missing Markers** / Thiếu Markers
   - Some chapters not detected
   - Một số chapters không được phát hiện
   - ✅ Gaps detected and fixed automatically
   - ✅ Gaps được phát hiện và sửa tự động

3. **Wrong Line Numbers** / Số Dòng Sai
   - LLM returns wrong line numbers
   - LLM trả về số dòng sai
   - ✅ Invalid indexes skipped
   - ✅ Indexes không hợp lệ được bỏ qua

4. **Missing End Lines** / Thiếu Dòng Cuối
   - Last chapter doesn't include end of file
   - Chapter cuối không bao gồm cuối file
   - ✅ Automatically fixed by adding to last chapter
   - ✅ Tự động sửa bằng cách thêm vào chapter cuối

5. **Overlapping Chapters** / Chapters Chồng chéo
   - Chapters overlap (shouldn't happen but handled)
   - Chapters chồng chéo (không nên xảy ra nhưng được xử lý)
   - ✅ Warning logged, text still preserved
   - ✅ Cảnh báo được ghi log, text vẫn được giữ

## Summary / Tóm tắt

The LLM parser now has **comprehensive guard logic** that ensures:
- ✅ **No text is lost** - All lines are preserved
- ✅ **Text order is preserved** - Lines are in the same order as original
- ✅ **Gaps are automatically fixed** - Missing lines are added to previous chapter
- ✅ **Missing end lines are automatically fixed** - Added to last chapter
- ✅ **Invalid markers are skipped** - Doesn't break parsing
- ✅ **Validation ensures correctness** - Compares expected vs actual

LLM parser hiện có **guard logic toàn diện** đảm bảo:
- ✅ **Không mất text** - Tất cả dòng được giữ
- ✅ **Thứ tự text được giữ** - Các dòng theo cùng thứ tự như gốc
- ✅ **Gaps được tự động sửa** - Các dòng thiếu được thêm vào chapter trước
- ✅ **Missing end lines được tự động sửa** - Được thêm vào chapter cuối
- ✅ **Markers không hợp lệ được bỏ qua** - Không làm hỏng parsing
- ✅ **Xác thực đảm bảo tính đúng đắn** - So sánh mong đợi vs thực tế

---

**Status**: ✅ Implemented with Enhanced Guard Logic  
**Date**: 2024-12-19

