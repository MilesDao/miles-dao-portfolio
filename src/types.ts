/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Project {
  id: string;
  title: string;
  category: string;
  year: string;
  description: string;
  tags: string[];
  link?: string;
  image?: string;
  sortOrder?: number;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface Blog {
  id: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  content: string;
  tags: string[];
  image?: string;
  sortOrder?: number;
}

export interface MediaItem {
  id: string;
  filename: string;
  url: string;
  size: string;
  type: string;
  uploadedAt: string;
}

export interface EducationExperience {
  id: string;
  category: string;
  location: string;
  period: string;
  items: string[];
  sortOrder: number;
}

export interface EditorBlock {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'bullet' | 'todo' | 'quote' | 'code' | 'callout' | 'toggle' | 'math' | 'table' | 'synced' | 'toc' | 'image';
  content: string;
  properties?: {
    checked?: boolean;
    language?: string;
    emoji?: string;
    isOpen?: boolean;
    color?: string;
    bgColor?: string;
    syncedId?: string;
    tableData?: string[][];
    imageUrl?: string;
    imageWidth?: number;
  };
}

