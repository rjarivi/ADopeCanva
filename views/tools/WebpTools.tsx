import React from 'react';
import { GifMaker } from './GifMaker';
import { VideoToGif } from './VideoToGif';
import { VideoConverter } from './VideoConverter';
import { ImageConverter } from './ImageConverter';

// WebP Maker (Images to Animated WebP)
export const WebpMaker: React.FC = () => {
    return <GifMaker initialOutputFormat="webp" />;
};


// Video to WebP
export const VideoToWebp: React.FC = () => {
    return <VideoToGif outputFormat="webp" />;
};

// Converters
export const GifToWebp: React.FC = () => {
    return <VideoConverter title="GIF to WebP" description="Convert GIF animations to Animated WebP" accept="image/gif" initialTargetFormat="WEBP" />;
};

export const JpgToWebp: React.FC = () => {
    return <ImageConverter title="JPG to WebP" description="Convert JPG to WebP format instantly." accept="image/jpeg,image/jpg" initialTargetFormat="image/webp" />;
};

export const PngToWebp: React.FC = () => {
    return <ImageConverter title="PNG to WebP" description="Convert PNG to WebP format instantly." accept="image/png" initialTargetFormat="image/webp" />;
};

export const AvifToWebp: React.FC = () => {
    return <ImageConverter title="AVIF to WebP" description="Convert AVIF to WebP format instantly." accept="image/avif,.avif" initialTargetFormat="image/webp" />;
};

export const WebpToGif: React.FC = () => {
    return <VideoConverter title="WebP to GIF" description="Convert Animated WebP to GIF" accept="image/webp" initialTargetFormat="GIF" />;
};

export const WebpToJpg: React.FC = () => {
    return <ImageConverter title="WebP to JPG" description="Convert WebP to JPG format instantly." accept="image/webp" initialTargetFormat="image/jpeg" />;
};

export const WebpToPng: React.FC = () => {
    return <ImageConverter title="WebP to PNG" description="Convert WebP to PNG format instantly." accept="image/webp" initialTargetFormat="image/png" />;
};

export const WebpToMp4: React.FC = () => {
    return <VideoConverter title="WebP to MP4" description="Convert Animated WebP to MP4" accept="image/webp" initialTargetFormat="MP4" />;
};
