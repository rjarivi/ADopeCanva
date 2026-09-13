
import React from 'react';
import { GifMaker } from './GifMaker';
import { VideoToGif } from './VideoToGif';
import { VideoConverter } from './VideoConverter';

// APNG Maker (Images to APNG)
export const ApngMaker: React.FC = () => {
    return <GifMaker initialOutputFormat="apng" />;
};

// Video to APNG
export const VideoToApng: React.FC = () => {
    // Similar dependency on VideoToGif refactor.
    return <VideoToGif outputFormat="apng" />;
};

// Converters
export const GifToApng: React.FC = () => {
    return <VideoConverter title="GIF to APNG" description="Convert GIF animations to APNG" accept="image/gif" initialTargetFormat="APNG" />;
};

export const ApngToGif: React.FC = () => {
    return <VideoConverter title="APNG to GIF" description="Convert APNG animations to standard GIF" accept="image/png,image/apng" initialTargetFormat="GIF" />;
};

export const ApngToWebp: React.FC = () => {
    return <VideoConverter title="APNG to WebP" description="Convert APNG to animated WebP" accept="image/png,image/apng" initialTargetFormat="WEBP" />;
};

export const ApngToMp4: React.FC = () => {
    return <VideoConverter title="APNG to MP4" description="Convert APNG to MP4 Video" accept="image/png,image/apng" initialTargetFormat="MP4" />;
};

export const MngToApng: React.FC = () => {
    return <VideoConverter title="MNG to APNG" description="Convert MNG to APNG" accept=".mng" initialTargetFormat="APNG" />;
};
