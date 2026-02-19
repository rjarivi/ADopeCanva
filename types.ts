import React from 'react';
import { LucideIcon } from 'lucide-react';

declare global {
  interface Window {
    gtag: (command: string, id: string, config?: any) => void;
  }
  interface ImportMetaEnv {
    readonly VITE_FEEDBACK_API_URL: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
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

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SpecItem {
  label: string;
  value: string;
}

export interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: ToolCategory;
  component: React.ReactNode;
  popular?: boolean;
  comingSoon?: boolean;
  // SEO & Guides fields
  guideTitle?: string;
  guideContent?: string;
  faqs?: FAQItem[];
  specs?: SpecItem[];
  privacyNotes?: string;
  beforeAfterImage?: {
    before: string;
    after: string;
    alt: string;
  };
}

export interface FileData {
  file: File;
  previewUrl?: string;
  size: string;
  type: string;
}