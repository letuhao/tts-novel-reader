# ⚡ Quickest Setup / Cài đặt Nhanh nhất

## 🎯 You Already Have Everything! / Bạn Đã Có Mọi Thứ!

You have:
- ✅ `py` launcher (Python Launcher for Windows) - Built-in!
- ✅ `winget` (Windows Package Manager) - Built-in!

Bạn có:
- ✅ `py` launcher (Python Launcher for Windows) - Tích hợp!
- ✅ `winget` (Windows Package Manager) - Tích hợp!

## 🚀 Setup in 3 Commands / Cài đặt trong 3 Lệnh

### Command 1: Install Python 3.11 / Lệnh 1: Cài đặt Python 3.11

```powershell
winget install Python.Python.3.11
```

### Command 2: Verify / Lệnh 2: Kiểm tra

```powershell
py --list
```

**Expected output:**
```
 -V:3.11        Python 3.11
 -V:3.13 *      Python 3.13 (current)
```

### Command 3: Setup Project / Lệnh 3: Thiết lập Dự án

```powershell
cd D:\Works\source\novel-reader\app
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python --version  # Should be 3.11.x
```

## ✅ That's It! / Vậy thôi!

**No version manager needed!**  
**Không cần version manager!**

**Continue with PyTorch installation:**  
**Tiếp tục với cài đặt PyTorch:**

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
python main.py
```

---

**Easy, right?** 🎉  
**Dễ, đúng không?** 🎉

