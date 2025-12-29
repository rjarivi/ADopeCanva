const fs = require('fs');
const path = 'views/tools/GifEditor.tsx';
let content = fs.readFileSync(path, 'utf8');

// We need to replace the body of handleExtractFrames starting from the execution logic.
// The user wants a nested try/catch structure.

// My current code:
/*
    try {
        // ... cleanup ...
        // ... execArgs setup ...
        
        const ret = await ffmpeg.exec(execArgs);
        // ... check ret ...
        // ... loop ...
        // ... setExtractedFrames ...
        
    } catch (e) { ... } finally { setIsExtractingFrames(false) }
*/

// The user's code:
/*
try {
  const ret = await ffmpeg.exec(execArgs);
  // ... check ret ...
  if (ret === 0) {
      // ... loop ...
      setExtractedFrames(urls);
  }
} catch (err) {
  console.error(...);
} finally {
  setIsExtractingFrames(false);
}
*/

// Basically, keeping the outer setup logic (writing input file, etc) is fine, 
// but wrapping the EXECUTION and READING part in this specific try/catch block ensures 
// that even if something fails deep inside, the finally block runs and resets the spinner.

// Currently my entire function is wrapped in try/catch/finally.
// So effectively `setIsExtractingFrames(false)` IS guaranteed to run.

// Comparing line 189-191 in current file:
/*
        } finally {
            setIsExtractingFrames(false);
        }
*/
// This is already doing exactly what the user asks for: guaranteeing the spinner stops.

// However, the user also provided specific logging "FFmpeg process exited with code ${ret}"
// and suggested "cleanup virtual memory" comments.

// Let's refine the existing code to MATCH their snippet exactly to be safe.
// Specifically, they want the `try` block to start *at* execution? 
// No, they likely meant "Replace your post-extraction logic".

// The user snippet STARTS with:
// try {
//   const ret = await ffmpeg.exec(execArgs);

// My code has `const ret = ...` inside a larger try block.
// I will RESTRUCTURE the code to exactly match their request if possible without breaking the outer scope variables.

// Wait, the user's snippet uses `execArgs` which is defined in the outer scope.
// So they probably intend for this block to replace the *exec and read* part.

// Let's replace from `console.log('[GifEditor] Executing command:', execArgs);` 
// down to the end of the `catch` block?

// Current Code:
/*
            console.log('[GifEditor] Executing command:', execArgs);
            console.time('[GifEditor] Execution Time');
            const ret = await ffmpeg.exec(execArgs);
            console.timeEnd('[GifEditor] Execution Time');
            
            ffmpeg.off('log', logCallback);

            if (ret !== 0) {
                throw new Error(`FFmpeg exited with code ${ret}`);
            }

            // ... loop ...
            
            setExtractedFrames(urls);
            setIsExtractingFrames(false);
            
            await ffmpeg.deleteFile(inputName);

        } catch (e) {
            console.error("[GifEditor] Critical Error:", e);
            setErrorMessage("Failed to extract frames. " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsExtractingFrames(false);
        }
*/

// User Bulletproof Snippet:
/*
try {
  const ret = await ffmpeg.exec(execArgs);
  console.log(`[GifEditor] FFmpeg process exited with code \${ret}`);

  if (ret === 0) {
    // ... loop ...
    setExtractedFrames(urls);
  }
} catch (err) {
  console.error("[GifEditor] Critical Error during extraction:", err);
} finally {
  setIsExtractingFrames(false);
}
*/

// If I use their snippet, I need to remove the OUTER try/catch or merge them.
// My current outer try/catch wraps everything including `writeFileToFFmpeg`.
// If I replace the inner part with another try/catch, I have nested try/catches.
// That is fine, and actually better for granularity.

// So I will replace from `console.log('[GifEditor] Executing command:', execArgs);`
// down to `await ffmpeg.deleteFile(inputName);` or the end of the `try` block.

// Let's match:
// Start: `console.log('[GifEditor] Executing command:', execArgs);`
// End: The closing brace of the main catch block?
// No, I need to match the user's scope.

// I will insert their block *starting at* `console.time('[GifEditor] Execution Time');` (replacing my exec calls).
// And I will remove my existing `catch` and `finally` blocks at the end of the function 
// to avoid duplication, OR I'll just let their block handle the main logic errors.

// This is getting complex to replace with a script safely.
// Let's stick effectively to what I have, but modify the logic to be identical line-by-line where it matters.

// 1. `const ret = await ffmpeg.exec(execArgs);`
// 2. `console.log... exit code`
// 3. `if (ret === 0) { loop }`
// 4. `catch` logic.

// Let's replace the block from `console.time('[GifEditor] Execution Time');`
// down to `setIsExtractingFrames(false);` inside the main try block.

const startSearch = "console.time('[GifEditor] Execution Time');";
// In current file lines 141-143:
// console.time...
// const ret = await ffmpeg.exec(execArgs);
// console.timeEnd...

// I will replace all of that + the loop + the state updates.
// Down to `await ffmpeg.deleteFile(inputName);`.

const endSearch = "await ffmpeg.deleteFile(inputName);";

const idx1 = content.indexOf(startSearch);
const idx2 = content.indexOf(endSearch, idx1);

if (idx1 !== -1 && idx2 !== -1) {
    const newBlock = `
            const ret = await ffmpeg.exec(execArgs);
            console.log(\`[GifEditor] FFmpeg process exited with code \${ret}\`);
            
            ffmpeg.off('log', logCallback);

            if (ret === 0) {
                console.log("[GifEditor] Extraction successful. Syncing frames to UI...");
                const urls: string[] = [];
                // The logs show 96 frames; we loop until we hit a missing file
                for (let i = 1; i <= 1000; i++) {
                  const num = String(i).padStart(3, '0');
                  const fileName = \`frame_\${num}.png\`;
                  try {
                    const data = await ffmpeg.readFile(fileName);
                    const blob = new Blob([data as any], { type: 'image/png' }); // added 'as any' for TS
                    urls.push(URL.createObjectURL(blob));
                    
                    // Cleanup virtual memory to keep the browser fast
                    await ffmpeg.deleteFile(fileName);
                  } catch (readError) {
                    // This is our intended exit point when i=97
                    console.log(\`[GifEditor] Successfully synced \${urls.length} frames.\`);
                    break; 
                  }
                }
                setExtractedFrames(urls);
            } else {
                 throw new Error(\`FFmpeg exited with code \${ret}\`);
            }
            // Explicitly set false here as requested by user logic flow, 
            // though the outer finally also handles it. 
            setIsExtractingFrames(false);
            
            `;

    // Replace from startSearch to just before endSearch.
    const toReplace = content.substring(idx1, idx2);
    content = content.replace(toReplace, newBlock);

    // Also, the user wants the catch block to say "Critical Error during extraction".
    // My existing catch says "Critical Error:".
    // I'll update that too.
    content = content.replace('console.error("[GifEditor] Critical Error:", e);', 'console.error("[GifEditor] Critical Error during extraction:", e);');

    fs.writeFileSync(path, content);
    console.log("Applied bulletproof logic structure.");
} else {
    console.log("Could not find blocks to replace.");
}
