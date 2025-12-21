# STT Backend Documentation

Comprehensive documentation for the Speech-to-Text (STT) backend service.

## 📚 Documentation Index

### Getting Started
- [Quick Start Guide](./QUICK_START.md) - Get up and running quickly
- [Installation Guide](./INSTALLATION.md) - Detailed installation instructions
- [Configuration Guide](./CONFIGURATION.md) - Configuration options and settings

### API Documentation
- [API Reference](./API_REFERENCE.md) - Complete API endpoint documentation
- [Request Examples](./API_EXAMPLES.md) - Code examples for using the API
- [Response Formats](./RESPONSE_FORMATS.md) - Response structure and formats

### Technical Documentation
- [Architecture](./ARCHITECTURE.md) - System architecture and design
- [Model Information](./MODEL_INFO.md) - Whisper Large V3 model details
- [Performance Guide](./PERFORMANCE.md) - Performance optimization and benchmarks

### Integration
- [Integration Guide](./INTEGRATION.md) - Integrating with other services
- [English Tutor Integration](./ENGLISH_TUTOR_INTEGRATION.md) - Integration with English Tutor app

### Troubleshooting
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions
- [FAQ](./FAQ.md) - Frequently asked questions

## 🚀 Quick Links

- **Service URL:** http://localhost:11210
- **API Docs:** http://localhost:11210/docs
- **Health Check:** http://localhost:11210/health

## 📖 Overview

The STT backend is a FastAPI-based service that provides speech-to-text transcription using OpenAI's Whisper Large V3 model, optimized with faster-whisper (CTranslate2) for real-time performance.

### Key Features

- ✅ **High Accuracy:** State-of-the-art Whisper Large V3 model
- ✅ **Fast Performance:** 4-10x faster than standard Whisper
- ✅ **Real-time Capable:** Optimized for RTX 4090 GPU
- ✅ **Multi-language:** Supports 99 languages
- ✅ **Voice Activity Detection:** Automatic silence filtering
- ✅ **Timestamps:** Segment and word-level timestamps
- ✅ **Translation:** Speech translation to English

### Model

- **Model:** faster-whisper-large-v3
- **Format:** CTranslate2 (optimized)
- **Quantization:** FP16 (float16)
- **Size:** ~2.9 GB
- **Source:** OpenAI Whisper Large V3

---

**Last Updated:** 2024-12-21  
**Version:** 1.0.0

