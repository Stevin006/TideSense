import * as SQLite from 'expo-sqlite';

export interface DetectionRecord {
  id?: number;
  timestamp: string;
  riskLevel: string;
  confidence: number;
  latitude: number | null;
  longitude: number | null;
  noaaRisk: string | null;
  imageBase64: string | null;
}

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync('tidesense.db');
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS detections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      riskLevel TEXT NOT NULL,
      confidence REAL NOT NULL,
      latitude REAL,
      longitude REAL,
      noaaRisk TEXT,
      imageBase64 TEXT
    );
  `);
  
  console.log('[DB] Database initialized');
  return db;
};

export const saveDetection = async (record: Omit<DetectionRecord, 'id'>) => {
  const database = await initDatabase();
  
  const result = await database.runAsync(
    `INSERT INTO detections (timestamp, riskLevel, confidence, latitude, longitude, noaaRisk, imageBase64)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      record.timestamp,
      record.riskLevel,
      record.confidence,
      record.latitude,
      record.longitude,
      record.noaaRisk,
      record.imageBase64,
    ]
  );
  
  console.log('[DB] Saved detection with ID:', result.lastInsertRowId);
  return result.lastInsertRowId;
};

export const getDetectionHistory = async (limit: number = 50): Promise<DetectionRecord[]> => {
  const database = await initDatabase();
  
  const results = await database.getAllAsync<DetectionRecord>(
    'SELECT * FROM detections ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
  
  console.log(`[DB] Retrieved ${results.length} detection records`);
  return results;
};

export const getDetectionById = async (id: number): Promise<DetectionRecord | null> => {
  const database = await initDatabase();
  
  const result = await database.getFirstAsync<DetectionRecord>(
    'SELECT * FROM detections WHERE id = ?',
    [id]
  );
  
  return result || null;
};

export const getDetectionsByRisk = async (riskLevel: string): Promise<DetectionRecord[]> => {
  const database = await initDatabase();
  
  const results = await database.getAllAsync<DetectionRecord>(
    'SELECT * FROM detections WHERE riskLevel = ? ORDER BY timestamp DESC',
    [riskLevel]
  );
  
  return results;
};

export const deleteDetection = async (id: number) => {
  const database = await initDatabase();
  
  await database.runAsync('DELETE FROM detections WHERE id = ?', [id]);
  console.log('[DB] Deleted detection:', id);
};

export const clearAllDetections = async () => {
  const database = await initDatabase();
  
  await database.runAsync('DELETE FROM detections');
  console.log('[DB] Cleared all detections');
};

export const getDetectionStats = async () => {
  const database = await initDatabase();
  
  const totalResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM detections'
  );
  
  const highResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM detections WHERE riskLevel = ?',
    ['HIGH']
  );
  
  const moderateResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM detections WHERE riskLevel = ?',
    ['MODERATE']
  );
  
  const lowResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM detections WHERE riskLevel = ?',
    ['LOW']
  );
  
  return {
    total: totalResult?.count || 0,
    high: highResult?.count || 0,
    moderate: moderateResult?.count || 0,
    low: lowResult?.count || 0,
  };
};
