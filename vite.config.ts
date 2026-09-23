import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    },
    preview: {
      port: 3000,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/core', '@ffmpeg/util'],
      include: ['util', 'stream-browserify', 'events', 'xml-js']
    },
    plugins: [tailwindcss(), react(), crossOriginIsolation()],
    build: {
      rollupOptions: {
        output: {
          // Deterministic chunk names: vendors keep their URLs across
          // deploys (long-term caching), tools split per manifest entry.
          // Anything not matched falls back to Rollup's shared chunks.
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-router-dom') || /node_modules\/react\//.test(id) || id.includes('node_modules/react-dom/')) return 'vendor-react';
              if (id.includes('pdfjs-dist') || id.includes('pdf-lib') || id.includes('jspdf')) return 'vendor-pdf';
              if (id.includes('@ffmpeg') || id.includes('/three/') || id.includes('three.module')) return 'vendor-media';
              if (id.includes('exceljs') || id.includes('docx') || id.includes('mammoth') || id.includes('papaparse') || id.includes('jszip') || id.includes('xml-js') || id.includes('js-yaml')) return 'vendor-docs';
              if (id.includes('@huggingface') || id.includes('onnxruntime')) return 'vendor-ai';
              if (id.includes('heic2any') || id.includes('html2canvas') || id.includes('html-to-image') || id.includes('qrious') || id.includes('gifshot')) return 'vendor-capture';
              if (id.includes('lucide-react')) return 'vendor-icons';
              // Unmatched node_modules: let Rollup split automatically.
              // (A catch-all here would fuse entry-needed and tool-only code
              // into one file and regress first paint.)
              return undefined;
            }
            const toolMatch = id.match(/[/\\]tools[/\\]([^/\\]+)[/\\]/);
            if (toolMatch && !toolMatch[1].startsWith('_')) return `tool-${toolMatch[1]}`;
            return undefined;
          },
        },
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'global': 'globalThis'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'stream': 'stream-browserify',
        'events': 'events',
        'util': 'util/',
      }
    }
  };
});
