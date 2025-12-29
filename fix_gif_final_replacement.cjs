const fs = require('fs');
const path = 'views/tools/GifEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// We will locate `const handleExtractFrames` and replace it entirely up to the start of `const handleProcess`.
const startMarker = "const handleExtractFrames = async () => {";
const endMarker = "const handleProcess = async";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    // Find the end of the previous function block.
    // It should end with `};` before `const handleProcess`.
    const blockEndIdx = content.lastIndexOf("};", endIdx);

    if (blockEndIdx !== -1) {
        const replacement = `    const handleExtractFrames = async () => {
        if (!ffmpegRef.current || !file) {
            console.error("[GifEditor] FFmpeg not loaded or no file selected.");
            return;
        }
        setIsExtractingFrames(true);
        setExtractedFrames([]);
        setDeletedFrames(new Set());
        setErrorMessage('');

        console.log("[GifEditor] handleExtractFrames started (Root + fps_mode).");

        try {
            const ffmpeg = ffmpegRef.current;
            const rawExt = file.file.name.split('.').pop()?.toLowerCase() || 'gif';
            const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
            const inputName = 'extract_input.' + ext;
            
            console.log('[GifEditor] Writing file to FS:', inputName);
            await writeFileToFFmpeg(ffmpeg, inputName, file.file);
            
            // CLEANUP: Remove any existing frames from previous runs to prevent "ghost" frames
            try {
                const existingFiles = await ffmpeg.listDir('.');
                for (const f of existingFiles) {
                    if (f.name.startsWith('frame_')) {
                        await ffmpeg.deleteFile(f.name);
                    }
                }
            } catch (e) { /* ignore if dir empty */ }

            const logCallback = ({ message }: { message: string }) => console.log(\`[FFmpeg-Extract]: \${message}\`);
            ffmpeg.on('log', logCallback);

            /**
             * FIX APPLIED HERE:
             * 1. Global options (-threads)
             * 2. Input options (-f gif)
             * 3. Input file (-i)
             * 4. Output options (-vf, -fps_mode, -f image2)
             * 5. Output pattern
             */
            const execArgs = ['-threads', '1'];
            
            if (ext === 'gif') {
                execArgs.push('-f', 'gif'); 
            }
            
            execArgs.push(
                '-i', inputName,                // Input
                '-vf', 'scale=160:-1',          // Output filter
                '-fps_mode', 'passthrough',     // Output option (must be after -i)
                '-f', 'image2',                 // Force image muxer
                'frame_%03d.png'                // Output pattern
            );
            
            console.log('[GifEditor] Executing command:', execArgs);
            console.time('[GifEditor] Execution Time');
            const ret = await ffmpeg.exec(execArgs);
            console.timeEnd('[GifEditor] Execution Time');
            
            ffmpeg.off('log', logCallback);

            if (ret !== 0) {
                throw new Error(\`FFmpeg exited with code \${ret}\`);
            }

            // Blind Read Strategy - Root
            console.log("[GifEditor] Starting Blind Read from root...");
            const urls: string[] = [];
            let frameCount = 0;
            const maxFrames = 1000;
            
            for (let i = 1; i <= maxFrames; i++) {
                const num = String(i).padStart(3, '0');
                const fileName = \`frame_\${num}.png\`;
                try {
                    const data = await ffmpeg.readFile(fileName);
                    const blob = new Blob([data as any], { type: 'image/png' });
                    const url = URL.createObjectURL(blob);
                    urls.push(url);
                    frameCount++;
                    
                    // Optional: delete from WASM memory once we have the Blob URL to save RAM
                    await ffmpeg.deleteFile(fileName); 
                } catch (e) {
                     break; // Reached the end of frames
                }
            }
            
            console.log(\`[GifEditor] Blind read complete. Found \${frameCount} frames.\`);

            if (frameCount === 0) {
                 setErrorMessage('No frames extracted. Check logs.');
            } else {
                 setExtractedFrames(urls);
            }

            await ffmpeg.deleteFile(inputName);

        } catch (e) {
            console.error("[GifEditor] Critical Error:", e);
            setErrorMessage("Failed to extract frames. " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsExtractingFrames(false);
        }
    };`;

        // Replace the substring from startIdx to blockEndIdx + 2 (covering "};")
        const toReplace = content.substring(startIdx, blockEndIdx + 2);
        content = content.replace(toReplace, replacement);

        fs.writeFileSync(path, content);
        console.log("Successfully replaced handleExtractFrames with verified user code.");

    } else {
        console.error("Could not find end of function block.");
    }
} else {
    console.error("Could not find function markers.");
}
