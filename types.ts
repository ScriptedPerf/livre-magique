
export interface Sentence {
  french: string;
  english: string;
}

export interface Keyword {
  word: string;
  pronunciation: string;
  explanation: string;
}

export interface PageCard {
  id: string;
  title: string;
  sentences: Sentence[];
  keywords: Keyword[];
  audio?: string;
  image?: string; // Base64 image of the PDF page
}

export interface BookRecord {
  id: string;
  title: string;
  pages: PageCard[];
  dateAdded: number;
  coverImage?: string;
  isSpread?: boolean;
}

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export const VOICES: { name: VoiceName; description: string }[] = [
  { name: 'Kore', description: 'Clear & Bright' },
  { name: 'Puck', description: 'Energetic' },
  { name: 'Charon', description: 'Deep & Calm' },
  { name: 'Fenrir', description: 'Strong' },
  { name: 'Zephyr', description: 'Soft' },
];
