<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EzEdit - The Ultimate Web-Based Media Toolkit

**EzEdit** (formerly ADopeCanva) is a powerful, privacy-focused web application offering a comprehensive suite of tools for content creators, developers, and everyday users. Built with the latest web technologies, it runs almost entirely in your browser using WebAssembly.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)
![FFmpeg](https://img.shields.io/badge/FFmpeg-WASM-green)

## ✨ Features

### 🎬 Video & Animation Suite
*   **Universal Converter**: Convert between MP4, MOV, AVI, MKV, WEBM, GIF, APNG, and WebP.
*   **Video Tools**: Trim videos, replace audio tracks, and convert video clips to seamless loops.
*   **Animation Powerhouse**:
    *   **GIF**: Create, Edit, Compress, and Convert. Includes a **Pro GIF Editor** with text overlay, cropping, and **Adaptive Sprite Sheet Export**.
    *   **APNG**: Full support for creating high-quality Animated PNGs from videos or images.
    *   **WebP**: Next-gen animated WebP creation and conversion tools.

### 🖼️ Image Tools
*   **AI Magic Editor**: Edit images using natural language prompts (powered by Google Gemini).
*   **Smart Background Remover**: Instantly remove backgrounds using AI.
*   **Essentials**: Compress, Crop, and Resize images without losing quality.
*   **Format Conversion**: Extensive support for modern formats like AVIF, WebP, JPG, and PNG.

### 🛠️ Developer & Utility Tools
*   **Universal Data Converter**: Convert between JSON, XML, CSV, and YAML instantly with a dual-pane editor.
*   **JSON Formatter**: Beautify, minify, and validate JSON data.
*   **SQL Formatter**: Organize complex SQL queries.
*   **Fancy Text**: Generate stylish Unicode fonts for social media.
*   **QR Generator**: Create custom QR codes.
*   **Text Cleaner**: Remove formatting and unwanted characters from text.

### 📄 PDF & Audio
*   **PDF Suite**: Merge, Split, and Compress PDF documents securely.
*   **Audio Tools**: Merge multiple tracks or convert between MP3, WAV, and AAC.

## 🔒 Privacy First architecture
Unlike other online tools, EzEdit processes your files **locally in your browser** using **FFmpeg WASM**.
*   ✅ No large video files are uploaded to any server.
*   ✅ Your data stays on your device.
*   *Note: AI-powered tools (Magic Editor, BG Remover) securely send data to Google's Gemini API for processing.*

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18 or higher recommended)
*   NPM or Yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/rjarivi/ADopeCanva.git
    cd ADopeCanva
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory and add your API credentials (optional, only for AI tools):
    ```env
    VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` to view the app.

## 🛠️ Built With

*   **[React 19](https://react.dev/)**: The library for web and native user interfaces.
*   **[Vite](https://vitejs.dev/)**: Next Generation Frontend Tooling.
*   **[FFmpeg.wasm](https://ffmpegwasm.netlify.app/)**: Port of FFmpeg to WebAssembly.
*   **[TailwindCSS](https://tailwindcss.com/)**: Rapidly build modern websites without ever leaving your HTML.
*   **[Google GenAI](https://ai.google.dev/)**: Powering intelligent image manipulation features.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
