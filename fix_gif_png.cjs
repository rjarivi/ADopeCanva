const fs = require('fs');
const path = 'views/tools/GifEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// I will look for the start of `handleExtractFrames` and replace the bulk of it.
// Or effectively replace the `execArgs` definition down to `setExtractedFrames`.

const startMarker = "const handleExtractFrames = async () => {";
const endMarker = "setExtractedFrames(urls);";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    // I want to replace the body.
    // Let's replace specifically the `try` block content or just the part we care about.

    // Previous "execArgs" code:
    /*
            const execArgs = ['-threads', '1', '-vsync', '0'];
            if (ext === 'gif') {
                execArgs.push('-f', 'gif');
            }
            execArgs.push('-i', inputName, '-vf', 'scale=160:-1', '-q:v', '5', 'frame_%03d.jpg');
            
            console.log('[GifEditor] Executing:', execArgs);
            await ffmpeg.exec(execArgs);
            
            ffmpeg.off('log', logCallback);

            // Read frames
            const files = await ffmpeg.listDir('.');
    */

    // I will use regex to find the `execArgs` block and replacing it.
    const regex = /const execArgs = \['-threads', '1', '-vsync', '0'\];[\s\S]*?await ffmpeg\.exec\(execArgs\);/;

    const newExecBlock = `const execArgs = ['-threads', '1', '-vsync', '0'];
            if (ext === 'gif') {
                execArgs.push('-f', 'gif');
            }
            // Coalesce for transparency, PNG for quality
            execArgs.push('-i', inputName, '-vf', 'coalesce,scale=160:-1', 'frame_%03d.png');
            
            console.log('[GifEditor] Executing:', execArgs);
            await ffmpeg.exec(execArgs);`;

    if (regex.test(content)) {
        content = content.replace(regex, newExecBlock);
        console.log('Updated exec block.');
    } else {
        console.log('Could not match exec block regex.');
    }

    // Now update the file reading part to look for PNGs.
    // Replace `frame_%03d.jpg` pattern if present in other places? No, just the filter.
    // .filter(f => f.name.startsWith('frame_') && f.name.endsWith('.jpg'))
    const jpgFilter = ".filter(f => f.name.startsWith('frame_') && f.name.endsWith('.jpg'))";
    const pngFilter = ".filter(f => f.name.startsWith('frame_') && f.name.endsWith('.png'))";

    if (content.includes(jpgFilter)) {
        content = content.replace(jpgFilter, pngFilter);
        console.log('Updated file filter.');
    }

    // Update Blob type
    // new Blob([data as any], { type: 'image/jpeg' });
    const jpgBlob = "new Blob([data as any], { type: 'image/jpeg' });";
    const pngBlob = "new Blob([data as any], { type: 'image/png' });";

    if (content.includes(jpgBlob)) {
        content = content.replace(jpgBlob, pngBlob);
        console.log('Updated Blob type.');
    }

    fs.writeFileSync(path, content);
} else {
    console.log('Could not find function bounds.');
}
