const fs = require('fs');
const path = 'views/tools/GifEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// We will replace the entire handleExtractFrames function with a super-verbose version.
// This is safer than small targeted edits since we want to touch multiple parts (pre-exec, exec, post-exec).

// Find the function
const startDecl = "const handleExtractFrames = async () => {";
const endDecl = "setIsExtractingFrames(false);"; // The finally block.

const startIdx = content.indexOf(startDecl);
const endIdx = content.indexOf(endDecl, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    // We replace the body of the function (well, almost all of it).
    // Let's create the full replacement string.

    const newFunctionBody = `    const handleExtractFrames = async () => {
        if (!ffmpegRef.current || !file) {
            console.error("[GifEditor] FFmpeg not loaded or no file selected.");
            return;
        }
        setIsExtractingFrames(true);
        setExtractedFrames([]);
        setDeletedFrames(new Set());
        setErrorMessage('');

        console.log("[GifEditor] handleExtractFrames started.");

        try {
            const ffmpeg = ffmpegRef.current;
            const rawExt = file.file.name.split('.').pop()?.toLowerCase() || 'gif';
            const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
            const inputName = 'extract_input.' + ext;
            
            console.log('[GifEditor] Writing file to FS:', inputName);
            await writeFileToFFmpeg(ffmpeg, inputName, file.file);
            
            console.log('[GifEditor] Creating frames directory...');
            try {
                await ffmpeg.createDir('frames');
                console.log('[GifEditor] Created frames dir successfully.');
            } catch (e) {
                console.log('[GifEditor] frames dir might already exist (ignored).');
            }

            // Attach Logger
            const logCallback = ({ message }: { message: string }) => console.log(\`[FFmpeg-Extract]: \${message}\`);
            ffmpeg.on('log', logCallback);

            const execArgs = ['-threads', '1', '-vsync', '0'];
            if (ext === 'gif') {
                execArgs.push('-f', 'gif');
            }
            // Output to frames/frame_%03d.png
            execArgs.push('-i', inputName, '-vf', 'scale=160:-1', 'frames/frame_%03d.png');
            
            console.log('[GifEditor] Executing command:', execArgs);
            console.time('[GifEditor] Execution Time');
            await ffmpeg.exec(execArgs);
            console.timeEnd('[GifEditor] Execution Time');
            console.log('[GifEditor] Extraction command finished.');

            ffmpeg.off('log', logCallback);

            // Blind Read Strategy
            console.log("[GifEditor] Starting Blind Read from 'frames/'...");
            
            const urls: string[] = [];
            let frameCount = 0;
            const maxFrames = 1000;
            
            for (let i = 1; i <= maxFrames; i++) {
                const num = String(i).padStart(3, '0');
                const fileName = \`frames/frame_\${num}.png\`; // Use path with slash
                try {
                    const data = await ffmpeg.readFile(fileName);
                    const blob = new Blob([data as any], { type: 'image/png' });
                    const url = URL.createObjectURL(blob);
                    urls.push(url);
                    frameCount++;
                } catch (e) {
                     // Log the first failure to see if it's expected (end of stream) or weird error
                     if (i === 1) {
                         console.error("[GifEditor] FAILED TO READ FIRST FRAME:", fileName, e);
                     } else if (i === 2) {
                         // If frame 1 worked but 2 failed, maybe 1 was valid but sequence short?
                         console.log("Stopped reading at frame 2. Single frame gif?", e);
                     }
                     // Break silently for normal end of sequence
                     break;
                }
            }
            
            console.log(\`[GifEditor] Blind read complete. Found \${frameCount} frames.\`);
            console.log('URLs:', urls);

            if (frameCount === 0) {
                 setErrorMessage('No frames extracted. Check console for details.');
            } else {
                 setExtractedFrames(urls);
            }

            // Cleanup
            await ffmpeg.deleteFile(inputName);
            // Optional: Cleanup frames dir if supported/needed
            // try { await ffmpeg.deleteDir('frames'); } catch(e) {}

        } catch (e) {
            console.error("[GifEditor] CRITICAL ERROR during extraction:", e);
            setErrorMessage("Failed to extract frames. " + (e instanceof Error ? e.message : String(e)));
        } finally {
            console.log("[GifEditor] handleExtractFrames finished.");
            setIsExtractingFrames(false);
        }
    };`;

    // We replace the entire function body.
    // Wait, the regex needs to be precise.
    // The replace needs to target:
    // startDecl ... endDecl ... "}" (end of finally block) ... "};" (end of function)

    // Actually, `endIdx` points to `setIsExtractingFrames(false);`.
    // The surrounding block is `finally { ... }`.
    // And `};` closes the function.

    // Let's replace ONLY the lines we generated.
    // `newFunctionBody` starts with `const handle...`.
    // So we just overwrite the whole function definition in the file.

    // Need to find where the function ENDS.
    // It ends after the finally block's closing brace, then the function closing brace.
    // `setIsExtractingFrames(false);\n        }\n    };`

    const endFunction = "setIsExtractingFrames(false);\n        }\n    };";
    const realEndIdx = content.indexOf(endFunction, endIdx);

    if (realEndIdx !== -1) {
        const toReplace = content.substring(startIdx, realEndIdx + endFunction.length);
        content = content.replace(toReplace, newFunctionBody);
        fs.writeFileSync(path, content);
        console.log('Successfully replaced handleExtractFrames with verbose debug version.');
    } else {
        // Try loose matching for end
        console.log('Could not find strict function end. Trying loose match.');
        // We know it ends with `};` after the finally block.
        // Let's just assume the `endDecl` is inside the finally block and look for the next `};`.
        const nextClose = content.indexOf("};", endIdx);
        if (nextClose !== -1) {
            const toReplace = content.substring(startIdx, nextClose + 2);
            content = content.replace(toReplace, newFunctionBody);
            fs.writeFileSync(path, content);
            console.log('Successfully replaced handleExtractFrames (loose match).');
        } else {
            console.log('Failed to match function end.');
        }
    }
} else {
    console.log('Failed to find function start.');
}
