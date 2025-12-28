import React from 'react';
import { LucideIcon } from 'lucide-react';

declare global {
  interface Window {
    gtag: (command: string, id: string, config?: any) => void;
  }
}

export enum ToolCategory {
  VIDEO = 'Video',
  AUDIO = 'Audio',
  IMAGE = 'Image',
  DOCS = 'Docs',
  TEXT = 'Text',
  DEV = 'Developer',
}

export interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: ToolCategory;
  component: React.ReactNode;
  popular?: boolean;
}

export interface FileData {
  file: File;
  previewUrl?: string;
  size: string;
  type: string;
}