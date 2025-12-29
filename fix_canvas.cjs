const fs = require('fs');
const path = 'views/tools/ImageEditor.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.trim().startsWith('onMouseMove={(e) => {'));
const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.trim() === '/>');

if (startIdx !== -1 && endIdx !== -1) {
    console.log(`Found block from line ${startIdx + 1} to ${endIdx + 1}`);
    if (lines[startIdx - 1].trim() === '}}') {
        const count = endIdx - startIdx;
        lines.splice(startIdx, count);
        fs.writeFileSync(path, lines.join('\n'));
        console.log('Successfully removed canvas listeners.');
    } else {
        console.log('Safety check failed: Previous line was not "}}"');
        console.log('Previous line:', lines[startIdx - 1]);
    }
} else {
    console.log('Could not find start or end markers.');
}
