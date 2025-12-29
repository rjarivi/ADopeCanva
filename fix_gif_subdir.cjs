const fs = require('fs');
const path = 'views/tools/GifEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the handleExtractFrames function body logic.
// We'll target the block from `const execArgs` to `setExtractedFrames(urls);` again.

const startRegex = /const execArgs = \['-threads', '1', '-vsync', '0'\];/;
// We need to match up to setExtractedFrames.
// But we need to insert `await ffmpeg.createDir('frames');` before execArgs.

// Let's replace the whole block starting from `console.log('[GifEditor] Running extraction...');`

const blockStart = "console.log('[GifEditor] Running extraction...');";
const blockEnd = "setExtractedFrames(urls);";

const startIdx = content.indexOf(blockStart);
const endIdx = content.indexOf(blockEnd, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const newBlock = `console.log('[GifEditor] Running extraction...');

            // Attach Logger
            const logCallback = ({ message }: { message: string }) => console.log(\`[FFmpeg-Extract]: \${message}\`);
            ffmpeg.on('log', logCallback);

            // Clean/Create frames directory
            try {
                // await ffmpeg.deleteDir('frames'); // unsafe if not empty?
                // Just try create
                await ffmpeg.createDir('frames');
            } catch (e) {
                // Ignore if exists
            }

            const execArgs = ['-threads', '1', '-vsync', '0'];
            if (ext === 'gif') {
                execArgs.push('-f', 'gif');
            }
            // Output to frames/frame_%03d.png
            execArgs.push('-i', inputName, '-vf', 'scale=160:-1', 'frames/frame_%03d.png');
            
            console.log('[GifEditor] Executing:', execArgs);
            await ffmpeg.exec(execArgs);

            ffmpeg.off('log', logCallback);

            // Read frames from directory
            let files = [];
            try {
                files = await ffmpeg.listDir('frames');
            } catch (e) {
                console.error("Failed to list dir 'frames'", e);
            }
            
            console.log('[GifEditor] Files in frames/ FS:', files.length, files.map(f => f.name));

            const frameFiles = files
                .filter(f => f.name.startsWith('frame_') && f.name.endsWith('.png'))
                .sort((a, b) => a.name.localeCompare(b.name));

            console.log('[GifEditor] Frame files found:', frameFiles.length);

            if (frameFiles.length === 0) {
                setErrorMessage('No frames extracted. Check console for FFmpeg errors.');
                // Debug: Try to read one file blindly
                try {
                     await ffmpeg.readFile('frames/frame_001.png');
                     console.log("Blind read of frame_001 success!");
                } catch(e) {
                     console.log("Blind read failed:", e);
                }
            }

            const urls = [];
            for (const f of frameFiles) {
                const data = await ffmpeg.readFile(\`frames/\${f.name}\`);
                const blob = new Blob([data as any], { type: 'image/png' });
                const url = URL.createObjectURL(blob);
                urls.push(url);
            }
            
            // Clean up: delete input. we might want to delete frames dir too later?
            await ffmpeg.deleteFile(inputName);
            // We keep frames for now to be safe, or delete them? better keep for now.
            `;

    // We need to replace from startIdx to the end of the original block.
    // The original block ended with `await ffmpeg.deleteFile(inputName);` or similar.
    // My match for `endIdx` matches `setExtractedFrames(urls);`.
    // So if I replace up to `setExtractedFrames(urls);` with my new block (which ends before that), 
    // I need to ensure I don't duplicate or lose `setExtractedFrames`.

    // My newBlock ENDS exactly before `setExtractedFrames(urls);`.
    // So I should replace substring(startIdx, endIdx).

    // BUT, the original code had:
    /*
            // ... logic ...
            setExtractedFrames(urls);
            await ffmpeg.deleteFile(inputName);
    */
    // My new block includes the cleanup of inputName.
    // So I should replace beyond `setExtractedFrames(urls);`.

    // Let's rely on `ffmpeg.deleteFile(inputName);` as the end anchor.
    const strictEnd = "await ffmpeg.deleteFile(inputName);";
    const strictEndIdx = content.indexOf(strictEnd, startIdx);

    if (strictEndIdx !== -1) {
        // Replace from startIdx to strictEndIdx + length
        content = content.replace(content.substring(startIdx, strictEndIdx + strictEnd.length), newBlock + "\n            setExtractedFrames(urls);");

        fs.writeFileSync(path, content);
        console.log('Successfully updated to use frames/ subdirectory.');

    } else {
        console.log('Could not find end anchor.');
    }

} else {
    console.log('Could not find start anchor.');
}
