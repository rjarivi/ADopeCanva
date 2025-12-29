const fs = require('fs');
const path = 'views/tools/GifEditor.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const startMarker = '    const handleExtractFrames = async () => {';
const startIdx = lines.findIndex(l => l.trim().startsWith('const handleExtractFrames = async () => {'));
// Improved end finding: look for the next function start, then backtrack to the closing brace.
const nextFunctionIdx = lines.findIndex((l, idx) => idx > startIdx && l.trim().startsWith('const handleProcess = async'));
let endIdx = -1;

if (nextFunctionIdx !== -1) {
    // backtrack to find '};'
    // usually it's the line before (ignoring empty lines)
    for (let i = nextFunctionIdx - 1; i > startIdx; i--) {
        if (lines[i].trim() === '};') {
            endIdx = i;
            break;
        }
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    console.log(`Found function from line ${startIdx + 1} to ${endIdx + 1}`);

    const newFunction = `    const handleExtractFrames = async () => {
        if (!ffmpegRef.current || !file) return;
        setIsExtractingFrames(true);
        setExtractedFrames([]);
        setDeletedFrames(new Set());
        setErrorMessage('');

        try {
            const ffmpeg = ffmpegRef.current;
            const rawExt = file.file.name.split('.').pop()?.toLowerCase() || 'gif';
            const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
            const inputName = 'extract_input.' + ext;
            
            console.log('[GifEditor] Writing file:', inputName);
            await writeFileToFFmpeg(ffmpeg, inputName, file.file);
            
            console.log('[GifEditor] Running extraction...');
            // Extract all frames as low-res JPEGs
            // Using -vsync 0 to ensure all frames are output
            await ffmpeg.exec([
                '-i', inputName,
                '-vf', 'scale=160:-1',
                '-q:v', '5',
                'frame_%03d.jpg'
            ]);

            // Read frames
            const files = await ffmpeg.listDir('.');
            console.log('[GifEditor] Files in FS:', files.length);
            
            const frameFiles = files
                .filter(f => f.name.startsWith('frame_') && f.name.endsWith('.jpg'))
                .sort((a, b) => a.name.localeCompare(b.name));

            console.log('[GifEditor] Frame files found:', frameFiles.length);

            if (frameFiles.length === 0) {
                 setErrorMessage('No frames extracted. Check console for FFmpeg errors.');
            }

            const urls = [];
            for (const f of frameFiles) {
                const data = await ffmpeg.readFile(f.name);
                const blob = new Blob([data as any], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                urls.push(url);
            }

            setExtractedFrames(urls);
            await ffmpeg.deleteFile(inputName);

        } catch (e) {
            console.error(e);
            setErrorMessage("Failed to extract frames. " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsExtractingFrames(false);
        }
    };`;

    const newLines = newFunction.split('\n');
    lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);

    fs.writeFileSync(path, lines.join('\n'));
    console.log('Successfully replaced handleExtractFrames.');
} else {
    console.log('Could not find start or end markers.');
}
