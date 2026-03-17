export interface Song {
  file?: File;
  url?: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  coverBlob?: Blob | null;
  duration: number;
  isRadio?: boolean;
}

export type AccentColor = 'rose' | 'blue' | 'emerald' | 'violet' | 'amber';
