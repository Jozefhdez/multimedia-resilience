import * as SQLite from 'expo-sqlite';
import { Venue } from '../models/Venue';

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
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
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
    console.error('Error saving venue:', error);
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
    console.error('Error getting all venues:', error);
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
    console.error('Error getting pending venues:', error);
    return [];
  }
};

export const markAsSynced = async (id: string) => {
  try {
    const database = await getDatabase();
    await database.runAsync('UPDATE venues SET synced = 1 WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error marking as synced:', error);
  }
};
