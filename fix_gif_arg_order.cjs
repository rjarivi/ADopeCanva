const fs = require('fs');
const path = 'views/tools/GifEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// We need to fix the argument order.
// Current wrong order:
// const execArgs = ['-threads', '1', '-fps_mode', 'passthrough'];
// ...
// execArgs.push('-i', inputName, ...);

// Correct order:
// const execArgs = ['-threads', '1'];
// ...
// execArgs.push('-i', inputName, '-fps_mode', 'passthrough', ...);

const oldStart = "const execArgs = ['-threads', '1', '-fps_mode', 'passthrough'];";
const newStart = "const execArgs = ['-threads', '1'];";

if (content.includes(oldStart)) {
    content = content.replace(oldStart, newStart);
}

// Now find where we push the rest and insert fps_mode there.
// execArgs.push('-i', inputName, '-vf', 'scale=160:-1', 'frame_%03d.png');

const oldPush = "execArgs.push('-i', inputName, '-vf', 'scale=160:-1', 'frame_%03d.png');";
// We want to insert -fps_mode passthrough after inputName, or before -vf.
const newPush = "execArgs.push('-i', inputName, '-fps_mode', 'passthrough', '-vf', 'scale=160:-1', 'frame_%03d.png');";

if (content.includes(oldPush)) {
    content = content.replace(oldPush, newPush);
    console.log("Successfully reordered FFmpeg arguments.");
    fs.writeFileSync(path, content);
} else {
    // Regex fallback if simple replace failed due to whitespace
    const regex = /execArgs\.push\('-i',\s*inputName,\s*'-vf',\s*'scale=160:-1',\s*'frame_%03d\.png'\);/;
    if (regex.test(content)) {
        content = content.replace(regex, newPush);
        // Also ensure we removed it from the start if we used regex for the second part but strict for first?
        // Actually, if the first replace failed, we have a problem (duplicate args or missing args).
        // Let's assume strict match works for the generated code.
        console.log("Successfully reordered FFmpeg arguments (regex).");
        fs.writeFileSync(path, content);
    } else {
        console.log("Could not find push statement to update.");
        // Debug log to see what we have
        const pushIdx = content.indexOf("execArgs.push('-i'");
        if (pushIdx !== -1) {
            console.log("Found push at:", content.substring(pushIdx, pushIdx + 100));
        }
    }
}
