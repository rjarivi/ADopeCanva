/**
 * Client-Side Binary Encoders for BMP and ICO Formats
 * Generates valid binary blobs directly from canvas ImageData without external dependencies.
 */

/**
 * Encodes Canvas ImageData into an uncompressed 24-bit/32-bit Windows BMP Blob
 */
export function encodeImageDataToBMP(imageData: ImageData): Blob {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Row size must be padded to a multiple of 4 bytes
    const rowSize = Math.floor((24 * width + 31) / 32) * 4;
    const pixelArraySize = rowSize * height;
    const fileHeaderSize = 14;
    const dibHeaderSize = 40;
    const fileSize = fileHeaderSize + dibHeaderSize + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // --- BITMAP FILE HEADER (14 bytes) ---
    view.setUint8(0, 0x42); // 'B'
    view.setUint8(1, 0x4D); // 'M'
    view.setUint32(2, fileSize, true); // File size
    view.setUint16(6, 0, true); // Reserved
    view.setUint16(8, 0, true); // Reserved
    view.setUint32(10, fileHeaderSize + dibHeaderSize, true); // Offset to pixel data

    // --- DIB HEADER (BITMAPINFOHEADER - 40 bytes) ---
    view.setUint32(14, dibHeaderSize, true); // Header size
    view.setInt32(18, width, true); // Width
    view.setInt32(22, height, true); // Height (positive = bottom-up)
    view.setUint16(26, 1, true); // Color planes
    view.setUint16(28, 24, true); // 24 bits per pixel (BGR)
    view.setUint32(30, 0, true); // BI_RGB (no compression)
    view.setUint32(34, pixelArraySize, true); // Image data size
    view.setInt32(38, 2835, true); // Horizontal resolution (72 DPI)
    view.setInt32(42, 2835, true); // Vertical resolution (72 DPI)
    view.setUint32(46, 0, true); // Colors in palette
    view.setUint32(50, 0, true); // Important colors

    // --- PIXEL ARRAY (BGR, bottom to top) ---
    let offset = fileHeaderSize + dibHeaderSize;
    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];

            view.setUint8(offset++, b);
            view.setUint8(offset++, g);
            view.setUint8(offset++, r);
        }
        // Row padding
        const padding = rowSize - width * 3;
        for (let p = 0; p < padding; p++) {
            view.setUint8(offset++, 0);
        }
    }

    return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Encodes a PNG blob into a multi-resolution or single-icon Windows ICO file
 */
export async function encodePngToIco(pngBlob: Blob, size: number = 32): Promise<Blob> {
    const pngArrayBuffer = await pngBlob.arrayBuffer();
    const pngBytes = new Uint8Array(pngArrayBuffer);
    const pngSize = pngBytes.length;

    const icoHeaderSize = 6;
    const icoDirectorySize = 16;
    const totalSize = icoHeaderSize + icoDirectorySize + pngSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // --- ICONDIR Header ---
    view.setUint16(0, 0, true); // Reserved, must be 0
    view.setUint16(2, 1, true); // Image type: 1 = ICO
    view.setUint16(4, 1, true); // Number of images

    // --- ICONDIRENTRY ---
    view.setUint8(6, size >= 256 ? 0 : size); // Width (0 means 256)
    view.setUint8(7, size >= 256 ? 0 : size); // Height (0 means 256)
    view.setUint8(8, 0); // Color count (0 = 256+ colors)
    view.setUint8(9, 0); // Reserved
    view.setUint16(10, 1, true); // Color planes
    view.setUint16(12, 32, true); // Bits per pixel (32-bit RGBA)
    view.setUint32(14, pngSize, true); // Image data size
    view.setUint32(18, icoHeaderSize + icoDirectorySize, true); // Offset to image data

    // --- PNG Data Payload ---
    const icoBytes = new Uint8Array(buffer);
    icoBytes.set(pngBytes, icoHeaderSize + icoDirectorySize);

    return new Blob([buffer], { type: 'image/x-icon' });
}
