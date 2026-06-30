import * as fs from 'fs';
import * as path from 'path';

const CHUNKS_BASE_DIR = './data/upload-chunks';

export function getChunksDir(sessionId: string): string {
  return path.join(CHUNKS_BASE_DIR, sessionId);
}

export function ensureChunksDirExists(sessionId: string): string {
  const dir = getChunksDir(sessionId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function deleteChunksDir(sessionId: string): void {
  const dir = getChunksDir(sessionId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Sequential stream-based reassembly of chunks to avoid loading full files in memory.
 */
export async function reassembleChunks(
  sessionId: string,
  totalChunks: number,
  outputPath: string
): Promise<void> {
  const dir = getChunksDir(sessionId);
  
  // Ensure the output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(outputPath);

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(dir, `chunk-${i}`);
      
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Missing chunk file: ${chunkPath}`);
      }

      const readStream = fs.createReadStream(chunkPath);

      await new Promise<void>((resolve, reject) => {
        readStream.pipe(writeStream, { end: false });
        readStream.on('end', () => {
          resolve();
        });
        readStream.on('error', (err) => {
          reject(err);
        });
      });
    }

    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve();
      });
      writeStream.on('error', (err) => {
        reject(err);
      });
    });
  } catch (err) {
    writeStream.destroy();
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    throw err;
  }
}
