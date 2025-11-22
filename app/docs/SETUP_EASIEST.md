# ✅ Easiest Setup / Cài đặt Dễ nhất

## 🎯 Quickest Way / Cách Nhanh nhất

**You already have `py` launcher! Use it with winget for easy installation.**  
**Bạn đã có `py` launcher! Sử dụng nó với winget để cài đặt dễ dàng.**

## 🚀 Complete Setup (3 Commands!) / Cài đặt Hoàn chỉnh (3 Lệnh!)

### Step 1: Install Python 3.11 / Bước 1: Cài đặt Python 3.11

```powershell
winget install Python.Python.3.11
```

### Step 2: Verify / Bước 2: Kiểm tra

```powershell
py --list
# Should show both 3.11 and 3.13
```

### Step 3: Setup Project / Bước 3: Thiết lập Dự án

```powershell
cd D:\Works\source\novel-reader\app
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python --version  # Should be 3.11.x
```

Then continue with PyTorch installation as in SETUP_GUIDE.md

---

**That's it! No separate version manager needed!**  
**Vậy thôi! Không cần version manager riêng!**

