
import os

path = r'g:\Github-Projects-New\Omniedit\views\ProEditor.tsx'
with open(path, 'rb') as f:
    content = f.read()

# Normalize line endings to \n first
content = content.replace(b'\r\n', b'\n').replace(b'\r', b'\n')
lines = content.split(b'\n')

new_lines = []
for line in lines:
    try:
        text = line.decode('utf-8')
        
        # Look for the specific mangled pattern we saw: </div>'() => setIsResizin
        # This looks like 1115 and 1112 were merged but with a stray '
        if "</div>'() => setIsResizin" in text:
             print(f"Fixing specific mangle: {text}")
             text = text.replace("</div>'() => setIsResizin", "</div>")
        
        # General check for mergers
        # If ) => is followed by something that looks like the start of a line
        # or if </div> is followed by code
        if "</div>" in text and "className=" in text:
             print(f"Fixing merger: {text}")
             text = text.replace("</div>", "</div>\n")
        
        new_lines.append(text)
    except:
        continue

final_text = '\n'.join(new_lines)

# Manually fix the problematic area 1107-1115
# Let's just make sure it's clean.
# 1107: </div>
# 1108: 
# 1109: {/* ... */}
# 1110: <div ...

with open(path, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(final_text)

print("File de-mangled.")
