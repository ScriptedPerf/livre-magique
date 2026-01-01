
export interface PageCard {
  id: string;
  title: string;
  keySentences: string[];
  audio?: string;
  image?: string; // Base64 image of the PDF page
}

export interface BookRecord {
  id: string;
  title: string;
  pages: PageCard[];
  dateAdded: number;
  coverImage?: string;
}

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export const VOICES: { name: VoiceName; description: string }[] = [
  { name: 'Kore', description: 'Clear & Bright' },
  { name: 'Puck', description: 'Energetic' },
  { name: 'Charon', description: 'Deep & Calm' },
  { name: 'Fenrir', description: 'Strong' },
  { name: 'Zephyr', description: 'Soft' },
];
