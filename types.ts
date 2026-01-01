
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

export type VoiceName = 'Marie' | 'Pierre' | 'Léa' | 'Thomas';

export const VOICES: { name: VoiceName; description: string }[] = [
  { name: 'Marie', description: 'Douce & Claire' },   // Neural2-A (Female)
  { name: 'Pierre', description: 'Calme & Profond' }, // Neural2-B (Male)
  { name: 'Léa', description: 'Dynamique' },        // Neural2-C (Female)
  { name: 'Thomas', description: 'Sérieux' },         // Neural2-D (Male)
];
