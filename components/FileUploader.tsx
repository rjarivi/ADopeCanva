/// <reference lib="dom" />
import React, { useRef, useState } from 'react';
import { Upload, X, File as FileIcon, Check } from 'lucide-react';
import { FileData } from '../types';

interface FileUploaderProps {
  onFileSelect?: (file: FileData) => void;
  onFilesSelect?: (files: FileData[]) => void;
  accept?: string;
  label?: string;
  description?: string;
  multiple?: boolean;
  className?: string;
  icon?: React.ElementType;
  compact?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  onFilesSelect,
  accept = "*",
  label = "Upload File",
  description = "Drag & drop or click to browse",
  multiple = false,
  className = "",
  icon: Icon = Upload,
  compact = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      handleFiles(Array.from(target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    if (!multiple && files.length > 1) {
      files = [files[0]];
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            processFiles(files);
            setIsUploading(false);
            setUploadProgress(0);
          }, 200);
          return 100;
        }
        return prev + 10;
      });
    }, 50);
  };

  const processFiles = (files: File[]) => {
    const processedFiles: FileData[] = files.map(file => ({
      file,
      type: file.type,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      previewUrl: (file.type.startsWith('image/') || file.type.startsWith('video/')) ? URL.createObjectURL(file) : undefined
    }));

    if (multiple && onFilesSelect) {
      onFilesSelect(processedFiles);
    } else if (onFileSelect && processedFiles.length > 0) {
      onFileSelect(processedFiles[0]);
    }
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 group ${isDragging
        ? 'border-indigo-500 bg-indigo-500/10'
        : 'border-zinc-700 bg-surface hover:border-indigo-500 hover:bg-indigo-500/5 hover:shadow-[0_0_25px_rgba(99,102,241,0.15)]'
        } ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
    >
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept={accept}
        multiple={multiple}
      />

      {isUploading ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center ${compact ? 'py-4 px-4' : 'py-12 px-4'} text-center cursor-pointer h-full`}>
          <div className={`${compact ? 'p-2 mb-2' : 'p-4 mb-4'} rounded-full transition-all duration-300 border border-transparent ${isDragging ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500' : 'bg-zinc-800 text-zinc-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] group-hover:scale-110'}`}>
            <Icon size={compact ? 20 : 32} />
          </div>
          <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-zinc-100 mb-1`}>{label}</h3>
          {!compact && <p className="text-sm text-zinc-400 max-w-xs">{description}</p>}
          {multiple && !compact && <span className="mt-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">Multi-file supported</span>}

          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/90 backdrop-blur-sm transition-opacity">
              <p className="text-white font-bold text-xl">Drop it like it's hot!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};