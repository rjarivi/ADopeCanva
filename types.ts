import React from 'react';
import { LucideIcon } from 'lucide-react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
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

export interface HowToStep {
  stepNumber: number;
  title: string;
  description: string;
  tip?: string;
}

export interface ComparisonRow {
  label: string;
  values: Record<string, string | boolean>;
  highlight?: boolean;
}

export interface ComparisonTableData {
  title: string;
  headers: string[];
  rows: ComparisonRow[];
}

export interface ProgrammaticSubRoute {
  slug: string;
  parentToolId: string;
  title: string;
  h1: string;
  metaDescription: string;
  sourceFormat?: string;
  targetFormat?: string;
  guideTitle?: string;
  guideContent?: string;
  steps?: HowToStep[];
  comparisonTable?: ComparisonTableData;
  faqs?: FAQItem[];
  keywords?: string[];
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
  swapId?: string;        // ID of the reverse/paired tool (enables swap button)
  /**
   * Phase 2 isolation: render inside the opaque-origin sandbox frame
   * (/sandbox.html) instead of directly. For vetted community tools that
   * haven't earned full first-party trust yet. Set via manifest.json.
   */
  sandbox?: boolean;
  // SEO & Guides fields
  seoTitle?: string;
  metaDescription?: string;
  guideTitle?: string;
  guideContent?: string;
  faqs?: FAQItem[];
  specs?: SpecItem[];
  steps?: HowToStep[];
  comparisonTable?: ComparisonTableData;
  relatedToolIds?: string[];
  subRoutes?: ProgrammaticSubRoute[];
  keywords?: string[];
  featureList?: string[];
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