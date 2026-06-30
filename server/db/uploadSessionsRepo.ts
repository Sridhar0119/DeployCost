import db from './connection';
import { UploadSession } from '../types';

export function createUploadSession(params: {
  id: string;
  org_id: number;
  user_id: number;
  filename: string;
  total_size: number;
  total_chunks: number;
}): void {
  const stmt = db.prepare(`
    INSERT INTO upload_sessions (id, org_id, user_id, filename, total_size, total_chunks, chunks_received, received_chunks_json, status)
    VALUES (?, ?, ?, ?, ?, ?, 0, '[]', 'in_progress')
  `);
  stmt.run(
    params.id,
    params.org_id,
    params.user_id,
    params.filename,
    params.total_size,
    params.total_chunks
  );
}

export function getUploadSession(id: string): UploadSession | null {
  const stmt = db.prepare('SELECT * FROM upload_sessions WHERE id = ?');
  const res = stmt.get(id);
  return (res as unknown as UploadSession) || null;
}

export function addChunkReceived(id: string, chunkIndex: number): {
  chunks_received: number;
  isCompleted: boolean;
} {
  db.exec('BEGIN TRANSACTION;');
  try {
    const session = getUploadSession(id);
    if (!session) {
      throw new Error(`Upload session not found: ${id}`);
    }

    let chunks: number[] = [];
    try {
      chunks = JSON.parse(session.received_chunks_json);
    } catch {
      chunks = [];
    }

    if (!chunks.includes(chunkIndex)) {
      chunks.push(chunkIndex);
      chunks.sort((a, b) => a - b);
    }

    const chunksReceived = chunks.length;
    const isCompleted = chunksReceived === session.total_chunks;
    const status = isCompleted ? 'completed' : 'in_progress';

    const stmt = db.prepare(`
      UPDATE upload_sessions
      SET chunks_received = ?,
          received_chunks_json = ?,
          status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(chunksReceived, JSON.stringify(chunks), status, id);

    db.exec('COMMIT;');
    return { chunks_received: chunksReceived, isCompleted };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function updateUploadSessionStatus(id: string, status: 'completed' | 'failed' | 'expired', errorMessage: string | null = null): void {
  const stmt = db.prepare(`
    UPDATE upload_sessions
    SET status = ?, error_message = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(status, errorMessage, id);
}

export function getExpiredSessions(hoursOld = 2): UploadSession[] {
  // SQLite datetime supports modifiers like '-2 hours'
  const stmt = db.prepare(`
    SELECT * FROM upload_sessions
    WHERE status = 'in_progress' AND datetime(updated_at) < datetime('now', ?)
  `);
  const res = stmt.all(`-${hoursOld} hours`);
  return (res as unknown as UploadSession[]) || [];
}
