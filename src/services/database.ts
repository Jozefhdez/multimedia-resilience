import * as SQLite from 'expo-sqlite';
import { Venue } from '../models/Venue';
import logger from '../utils/logger';

let db: SQLite.SQLiteDatabase | null = null;

const getDatabase = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('venues.db');
  }
  return db;
};

export const initDatabase = async () => {
  try {
    const database = await getDatabase();
    
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS venues (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        synced INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      );
    `);
    logger.captureMessage('Database initialized successfully', 'info');
  } catch (error) {
    logger.captureException(error, { where: 'initDatabase' });
  }
};

export const saveVenue = async (venue: Venue) => {
  try {
    const database = await getDatabase();
    await database.runAsync(
      'INSERT INTO venues (id, name, latitude, longitude, synced, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [venue.id, venue.name, venue.latitude, venue.longitude, venue.synced ? 1 : 0, venue.createdAt]
    );
  } catch (error) {
    logger.captureException(error, { where: 'saveVenue', venueId: venue.id });
    throw error;
  }
};

export const getAllVenues = async (): Promise<Venue[]> => {
  try {
    const database = await getDatabase();
    const result = await database.getAllAsync('SELECT * FROM venues');
    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      synced: row.synced === 1,
      createdAt: row.createdAt,
    }));
  } catch (error) {
    logger.captureException(error, { where: 'getAllVenues' });
    return [];
  }
};

export const getPendingVenues = async (): Promise<Venue[]> => {
  try {
    const database = await getDatabase();
    const result = await database.getAllAsync('SELECT * FROM venues WHERE synced = 0');
    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      synced: false,
      createdAt: row.createdAt,
    }));
  } catch (error) {
    logger.captureException(error, { where: 'getPendingVenues' });
    return [];
  }
};

export const markAsSynced = async (id: string) => {
  try {
    const database = await getDatabase();
    await database.runAsync('UPDATE venues SET synced = 1 WHERE id = ?', [id]);
  } catch (error) {
    logger.captureException(error, { where: 'markAsSynced', venueId: id });
  }
};
