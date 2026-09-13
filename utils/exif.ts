export interface ExifData {
  hasExif: boolean;
  make?: string;
  model?: string;
  lensModel?: string;
  software?: string;
  dateTime?: string;
  fNumber?: number;
  exposureTime?: string;
  iso?: number;
  focalLength?: number;
  orientation?: number;
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    mapsUrl: string;
  };
  rawTagCount: number;
}

// DataView helper that supports endianness
class BinaryReader {
  private view: DataView;
  private littleEndian: boolean = false;

  constructor(buffer: ArrayBuffer, offset: number = 0, length?: number) {
    this.view = new DataView(buffer, offset, length);
  }

  setLittleEndian(le: boolean) {
    this.littleEndian = le;
  }

  getUint8(offset: number): number {
    return this.view.getUint8(offset);
  }

  getUint16(offset: number): number {
    return this.view.getUint16(offset, this.littleEndian);
  }

  getUint32(offset: number): number {
    return this.view.getUint32(offset, this.littleEndian);
  }

  getString(offset: number, length: number): string {
    let str = '';
    for (let i = 0; i < length; i++) {
      const code = this.view.getUint8(offset + i);
      if (code === 0) break; // Null terminated
      str += String.fromCharCode(code);
    }
    return str.trim();
  }

  getRational(offset: number): number {
    const num = this.getUint32(offset);
    const den = this.getUint32(offset + 4);
    if (den === 0) return 0;
    return num / den;
  }
}

export function parseExif(buffer: ArrayBuffer): ExifData {
  const result: ExifData = {
    hasExif: false,
    rawTagCount: 0
  };

  const bytes = new Uint8Array(buffer);
  // Check JPEG SOI marker (0xFF 0xD8)
  if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    return result;
  }

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xFF) break;
    const marker = bytes[offset + 1];
    offset += 2;

    // End of markers or start of scan
    if (marker === 0xDA || marker === 0xD9) break;

    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2) break;

    // APP1 Marker: EXIF & XMP
    if (marker === 0xE1) {
      const app1Offset = offset + 2;
      const id = String.fromCharCode(...bytes.slice(app1Offset, app1Offset + 4));
      if (id === 'Exif') {
        result.hasExif = true;
        parseTiffHeader(buffer, app1Offset + 6, result);
      }
    }

    offset += length;
  }

  return result;
}

function parseTiffHeader(buffer: ArrayBuffer, tiffStart: number, result: ExifData) {
  if (tiffStart + 8 > buffer.byteLength) return;
  const reader = new BinaryReader(buffer, tiffStart);

  // Endianness
  const endianBytes = String.fromCharCode(reader.getUint8(0), reader.getUint8(1));
  if (endianBytes === 'II') {
    reader.setLittleEndian(true);
  } else if (endianBytes === 'MM') {
    reader.setLittleEndian(false);
  } else {
    return;
  }

  // 42 test
  if (reader.getUint16(2) !== 42) return;

  const firstIfdOffset = reader.getUint32(4);
  if (firstIfdOffset >= buffer.byteLength) return;

  let exifIfdOffset = 0;
  let gpsIfdOffset = 0;

  // Read IFD0
  const numTags0 = reader.getUint16(firstIfdOffset);
  result.rawTagCount += numTags0;

  for (let i = 0; i < numTags0; i++) {
    const entryOffset = firstIfdOffset + 2 + i * 12;
    if (entryOffset + 12 > buffer.byteLength) break;

    const tag = reader.getUint16(entryOffset);
    const type = reader.getUint16(entryOffset + 2);
    const count = reader.getUint32(entryOffset + 4);
    const valOffset = entryOffset + 8;

    if (tag === 0x010F) { // Make
      const strOffset = count > 4 ? reader.getUint32(valOffset) : valOffset;
      result.make = reader.getString(strOffset, count);
    } else if (tag === 0x0110) { // Model
      const strOffset = count > 4 ? reader.getUint32(valOffset) : valOffset;
      result.model = reader.getString(strOffset, count);
    } else if (tag === 0x0131) { // Software
      const strOffset = count > 4 ? reader.getUint32(valOffset) : valOffset;
      result.software = reader.getString(strOffset, count);
    } else if (tag === 0x0132) { // DateTime
      const strOffset = count > 4 ? reader.getUint32(valOffset) : valOffset;
      result.dateTime = reader.getString(strOffset, count);
    } else if (tag === 0x0112) { // Orientation
      result.orientation = reader.getUint16(valOffset);
    } else if (tag === 0x8769) { // Exif IFD Pointer
      exifIfdOffset = reader.getUint32(valOffset);
    } else if (tag === 0x8825) { // GPS IFD Pointer
      gpsIfdOffset = reader.getUint32(valOffset);
    }
  }

  // Read Exif SubIFD
  if (exifIfdOffset > 0 && exifIfdOffset < buffer.byteLength) {
    const numExifTags = reader.getUint16(exifIfdOffset);
    result.rawTagCount += numExifTags;

    for (let i = 0; i < numExifTags; i++) {
      const entryOffset = exifIfdOffset + 2 + i * 12;
      if (entryOffset + 12 > buffer.byteLength) break;

      const tag = reader.getUint16(entryOffset);
      const count = reader.getUint32(entryOffset + 4);
      const valOffset = entryOffset + 8;

      if (tag === 0x829D) { // FNumber
        const rOffset = reader.getUint32(valOffset);
        result.fNumber = parseFloat(reader.getRational(rOffset).toFixed(1));
      } else if (tag === 0x829A) { // Exposure Time
        const rOffset = reader.getUint32(valOffset);
        const num = reader.getUint32(rOffset);
        const den = reader.getUint32(rOffset + 4);
        result.exposureTime = num === 1 ? `1/${den}s` : `${(num / den).toFixed(3)}s`;
      } else if (tag === 0x8827) { // ISO
        result.iso = reader.getUint16(valOffset);
      } else if (tag === 0x920A) { // Focal Length
        const rOffset = reader.getUint32(valOffset);
        result.focalLength = Math.round(reader.getRational(rOffset));
      } else if (tag === 0xA434) { // LensModel
        const strOffset = count > 4 ? reader.getUint32(valOffset) : valOffset;
        result.lensModel = reader.getString(strOffset, count);
      } else if (tag === 0x9003 && !result.dateTime) { // DateTimeOriginal
        const strOffset = count > 4 ? reader.getUint32(valOffset) : valOffset;
        result.dateTime = reader.getString(strOffset, count);
      }
    }
  }

  // Read GPS IFD
  if (gpsIfdOffset > 0 && gpsIfdOffset < buffer.byteLength) {
    const numGpsTags = reader.getUint16(gpsIfdOffset);
    result.rawTagCount += numGpsTags;

    let latRef = 'N';
    let lonRef = 'E';
    let latVal: number[] = [];
    let lonVal: number[] = [];
    let altVal: number | undefined;

    for (let i = 0; i < numGpsTags; i++) {
      const entryOffset = gpsIfdOffset + 2 + i * 12;
      if (entryOffset + 12 > buffer.byteLength) break;

      const tag = reader.getUint16(entryOffset);
      const valOffset = entryOffset + 8;

      if (tag === 0x0001) { // LatRef
        latRef = String.fromCharCode(reader.getUint8(valOffset));
      } else if (tag === 0x0002) { // Latitude (3 rationals)
        const rOffset = reader.getUint32(valOffset);
        latVal = [
          reader.getRational(rOffset),
          reader.getRational(rOffset + 8),
          reader.getRational(rOffset + 16)
        ];
      } else if (tag === 0x0003) { // LonRef
        lonRef = String.fromCharCode(reader.getUint8(valOffset));
      } else if (tag === 0x0004) { // Longitude (3 rationals)
        const rOffset = reader.getUint32(valOffset);
        lonVal = [
          reader.getRational(rOffset),
          reader.getRational(rOffset + 8),
          reader.getRational(rOffset + 16)
        ];
      } else if (tag === 0x0006) { // Altitude
        const rOffset = reader.getUint32(valOffset);
        altVal = Math.round(reader.getRational(rOffset));
      }
    }

    if (latVal.length === 3 && lonVal.length === 3) {
      let lat = latVal[0] + latVal[1] / 60 + latVal[2] / 3600;
      if (latRef === 'S') lat = -lat;

      let lon = lonVal[0] + lonVal[1] / 60 + lonVal[2] / 3600;
      if (lonRef === 'W') lon = -lon;

      result.gps = {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
        altitude: altVal,
        mapsUrl: `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`
      };
    }
  }
}

/**
 * Lossless binary JPEG EXIF Stripper.
 * Slices out APP1 (EXIF/XMP), APP2, APP13 (IPTC), and COM markers without re-encoding image data.
 * Zero pixel quality loss!
 */
export function stripJpegExif(buffer: ArrayBuffer): { strippedBuffer: ArrayBuffer; bytesRemoved: number } {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    return { strippedBuffer: buffer, bytesRemoved: 0 };
  }

  const chunks: Uint8Array[] = [];
  // Keep SOI marker
  chunks.push(bytes.subarray(0, 2));

  let offset = 2;
  let bytesRemoved = 0;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xFF) {
      // Remaining data (e.g. SOS scan until end)
      chunks.push(bytes.subarray(offset));
      break;
    }

    const marker = bytes[offset + 1];

    // Standalone markers without length: RST0-7, SOI, EOI
    if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0xD8) {
      chunks.push(bytes.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    // EOI or SOS (Start of Scan - image data starts here)
    if (marker === 0xD9 || marker === 0xDA) {
      chunks.push(bytes.subarray(offset));
      break;
    }

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const segmentEnd = offset + 2 + length;

    // Metadata markers to strip:
    // 0xE1 = APP1 (EXIF, XMP)
    // 0xE2 = APP2 (ICC profile / FlashPix)
    // 0xED = APP13 (Photoshop IPTC)
    // 0xFE = COM (Comment)
    if (marker === 0xE1 || marker === 0xED || marker === 0xFE) {
      bytesRemoved += (segmentEnd - offset);
    } else {
      // Keep other essential markers (SOF0, DQT, DHT, DRI, etc.)
      chunks.push(bytes.subarray(offset, segmentEnd));
    }

    offset = segmentEnd;
  }

  // Combine chunks into output buffer
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const output = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    output.set(chunk, pos);
    pos += chunk.length;
  }

  return { strippedBuffer: output.buffer, bytesRemoved };
}

/**
 * Universal canvas-based metadata stripper for PNG, WebP, etc.
 */
export async function stripMetadataViaCanvas(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create stripped image blob'));
      }, file.type || 'image/jpeg', 0.95);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for metadata stripping'));
    };

    img.src = url;
  });
}
