import { FileData } from '../types';

export const isHeicFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
};

export const preprocessHeic = async (file: File): Promise<File> => {
  if (!isHeicFile(file)) return file;
  try {
    const heic2anyModule = await import('heic2any');
    const heic2any = heic2anyModule.default || heic2anyModule;
    const result = await (heic2any as any)({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92
    });
    const jpegBlob = Array.isArray(result) ? result[0] : result;
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';
    return new File([jpegBlob], `${nameWithoutExt}.jpg`, { type: 'image/jpeg' });
  } catch (e) {
    console.error('Failed to preprocess HEIC file:', e);
    return file;
  }
};

export const preprocessImageFileData = async (fileData: FileData): Promise<FileData> => {
  let file = fileData.file;
  if (isHeicFile(file)) {
    file = await preprocessHeic(file);
  }
  
  return {
    file,
    type: file.type || 'image/png',
    size: file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      : (file.size / 1024).toFixed(1) + ' KB',
    previewUrl: URL.createObjectURL(file)
  };
};
