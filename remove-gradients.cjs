const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        filelist = fs.statSync(path.join(dir, file)).isDirectory()
            ? walkSync(path.join(dir, file), filelist)
            : filelist.concat(path.join(dir, file));
    });
    return filelist;
}

const files = [
    ...walkSync('g:\\Github-Projects-New\\Omniedit\\views'),
    ...walkSync('g:\\Github-Projects-New\\Omniedit\\components'),
    'g:\\Github-Projects-New\\Omniedit\\App.tsx'
].filter(f => f.endsWith('.tsx'));

const gradientRegex = /\b(?:bg-gradient-to-[a-z]{1,2}|from-[a-z]+-\d{2,3}|to-[a-z]+-\d{2,3}|hover:from-[a-z]+-\d{2,3}|hover:to-[a-z]+-\d{2,3}|via-[a-z]+-\d{2,3})\b/g;

let updatedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We only want to remove gradients if they are part of a button's className.
    // Instead of parsing TSX, we can look for Button usage and specifically target its className
    // Actually, any <Button ... className="..."> where we strip the gradient classes.
    // A simpler approach is to use a regex to replace these classes inside className strings that contain `"w-full h-12` or `Button`

    // Instead of being too clever, let's just match any <Button ... > and inside it remove gradient classes.
    // It's easier:
    content = content.replace(/<Button[^>]+>/g, (match) => {
        return match.replace(gradientRegex, '').replace(/\s{2,}/g, ' ');
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        updatedFiles++;
        console.log('Updated Button gradients in:', file);
    }
});

console.log('Total files updated:', updatedFiles);
