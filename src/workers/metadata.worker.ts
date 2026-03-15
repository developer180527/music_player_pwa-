import * as mm from 'music-metadata';

self.onmessage = async (e: MessageEvent) => {
  const { files, id } = e.data;
  let parsedSongs: any[] = [];
  const CHUNK_SIZE = 10;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const metadata = await mm.parseBlob(file);
      let coverBlob: Blob | null = null;
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        coverBlob = new Blob([picture.data], { type: picture.format });
      }
      parsedSongs.push({
        file,
        title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || 'Unknown Album',
        coverBlob,
        duration: metadata.format.duration || 0,
      });
    } catch (error) {
      console.error('Error parsing metadata for', file.name, error);
      parsedSongs.push({
        file,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        coverBlob: null,
        duration: 0,
      });
    }

    // Send chunks to keep UI responsive and show progress
    if (parsedSongs.length >= CHUNK_SIZE || i === files.length - 1) {
      self.postMessage({ 
        id, 
        parsedSongs, 
        isComplete: i === files.length - 1 
      });
      parsedSongs = []; // Reset chunk
    }
  }
  
  if (files.length === 0) {
    self.postMessage({ id, parsedSongs: [], isComplete: true });
  }
};
