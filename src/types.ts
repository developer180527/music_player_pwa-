export interface Song {
  file: File;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  coverBlob?: Blob | null;
  duration: number;
}

export type AccentColor = 'rose' | 'blue' | 'emerald' | 'violet' | 'amber';
