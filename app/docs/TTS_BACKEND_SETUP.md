# TTS Backend Setup Guide / Hướng dẫn Cài đặt TTS Backend

## 🎯 Goal / Mục tiêu

Set up a unified TTS backend service in `D:\Works\source\novel-reader\app`  
Thiết lập một dịch vụ TTS backend thống nhất trong `D:\Works\source\novel-reader\app`

## ⚠️ Python Version Recommendation / Khuyến nghị Phiên bản Python

### Problem with Python 3.13 / Vấn đề với Python 3.13

- ❌ **No PyTorch CUDA wheels** for Python 3.13 yet
- ❌ VieNeu-TTS failed to use GPU because of this
- ❌ Limited library support

### ✅ Recommended Python Versions / Phiên bản Python Được Khuyến nghị

**Option 1: Python 3.11** (Best compatibility / Tương thích tốt nhất)
- ✅ Full PyTorch CUDA support
- ✅ Stable and well-tested
- ✅ Compatible with all TTS libraries
- ✅ Good performance

**Option 2: Python 3.12** (Latest stable / Phiên bản ổn định mới nhất)
- ✅ Full PyTorch CUDA support  
- ✅ Latest features
- ✅ Still well-supported
- ✅ Good performance

**Option 3: Python 3.10** (Minimum requirement / Yêu cầu tối thiểu)
- ✅ Supported by Dia-Finetuning-Vietnamese
- ✅ Older but stable
- ✅ Full CUDA support

### 🎯 Recommendation / Khuyến nghị

**Use Python 3.11** for best compatibility and stability  
**Sử dụng Python 3.11** để có tương thích và ổn định tốt nhất

## 📋 Setup Plan / Kế hoạch Cài đặt

### Step 1: Install Python 3.11 or 3.12
### Step 2: Create virtual environment
### Step 3: Set up TTS backend structure
### Step 4: Configure both TTS models (VieNeu-TTS and Dia)

