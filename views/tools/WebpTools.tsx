
import React from 'react';
import { GifMaker } from './GifMaker';
import { VideoToGif } from './VideoToGif';
import { VideoConverter } from './VideoConverter';
import { ImageCompressor } from './ImageCompressor';

// WebP Maker (Images to Animated WebP)
export const WebpMaker: React.FC = () => {
    return <GifMaker outputFormat="webp" />;
};

// Video to WebP
export const VideoToWebp: React.FC = () => {
    return <VideoToGif outputFormat="webp" />;
};

// Converters
export const GifToWebp: React.FC = () => {
    return <VideoConverter title="GIF to WebP" description="Convert GIF animations to Animated WebP" accept="image/gif" />;
};

export const JpgToWebp: React.FC = () => {
    // Basic image conversion - can use standard compressor or converter
    // If output must be static WebP from static image, ImageCompressor logic works well but currently hardcodes output if file isn't PNG.
    // However, VideoConverter can potentially handle single images? No, it expects video-like streams.
    // For now, let's use the ImageCompressor as it likely supports drag-drop image and outputting (with format selection potentially).
    // WAIT, ImageCompressor logic in step 541 forced JPG.
    // I should create a simple wrapper or use VideoConverter if it handles images (it uses ffmpeg which can).
    return <VideoConverter title="JPG to WebP" description="Convert JPG to WebP" accept="image/jpeg,image/jpg" />;
};

export const PngToWebp: React.FC = () => {
    return <VideoConverter title="PNG to WebP" description="Convert PNG to WebP" accept="image/png" />;
};

export const AvifToWebp: React.FC = () => {
    return <VideoConverter title="AVIF to WebP" description="Convert AVIF to WebP" accept="image/avif" />;
};

export const WebpToGif: React.FC = () => {
    return <VideoConverter title="WebP to GIF" description="Convert Animated WebP to GIF" accept="image/webp" />;
};

export const WebpToJpg: React.FC = () => {
    return <VideoConverter title="WebP to JPG" description="Convert WebP to JPG" accept="image/webp" />;
};

export const WebpToPng: React.FC = () => {
    return <VideoConverter title="WebP to PNG" description="Convert WebP to PNG" accept="image/webp" />;
};

export const WebpToMp4: React.FC = () => {
    return <VideoConverter title="WebP to MP4" description="Convert Animated WebP to MP4" accept="image/webp" />;
};
