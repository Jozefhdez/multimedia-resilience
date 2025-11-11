import axios, { AxiosError } from 'axios';
import { Venue } from '../models/Venue';
import logger from '../utils/logger';

const API_URL = 'https://jsonplaceholder.typicode.com/posts';

export interface SyncResult {
  success: boolean;
  syncedIds: string[];
  failedIds: string[];
  error?: string;
}

export interface BackgroundSyncResult {
  success: boolean;
  error?: string;
}

export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    await axios.head(API_URL, { timeout: 5000 });
    return true;
  } catch (error) {
    logger.captureMessage('Network check failed', 'warning');
    return false;
  }
};

export const sendVenue = async (venue: Venue): Promise<boolean> => {
  try {
    logger.captureMessage(`Attempting to sync venue: ${venue.name} (${venue.id})`, 'info');
    const response = await axios.post(API_URL, {
      venue: {
        id: venue.id,
        name: venue.name,
        latitude: venue.latitude,
        longitude: venue.longitude,
        createdAt: venue.createdAt,
      },
    }, {
      timeout: 10000,
    });
    
    logger.captureMessage(`Successfully synced venue: ${venue.name}`, 'info');
    return response.status === 200 || response.status === 201;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_NETWORK') {
        logger.captureMessage(`Network error syncing venue ${venue.id}: No connection`, 'warning');
      } else {
        logger.captureException(error, { venueId: venue.id, venueName: venue.name });
      }
    }
    return false;
  }
};

export const syncVenues = async (venues: Venue[]): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    syncedIds: [],
    failedIds: [],
  };

  const hasConnection = await checkNetworkConnection();
  if (!hasConnection) {
    logger.captureMessage('No network connection available. Skipping sync.', 'warning');
    result.failedIds = venues.map(v => v.id);
    result.error = 'No network connection';
    return result;
  }

  logger.captureMessage(`Starting sync of ${venues.length} venues...`, 'info');

  for (const venue of venues) {
    const success = await sendVenue(venue);
    if (success) {
      result.syncedIds.push(venue.id);
    } else {
      result.failedIds.push(venue.id);
    }
  }

  result.success = result.syncedIds.length > 0;
  logger.captureMessage(`Sync complete: ${result.syncedIds.length} synced, ${result.failedIds.length} failed`, 'info');
  
  return result;
};

export const sendVenuesBackground = async (venues: Venue[]): Promise<BackgroundSyncResult> => {
  try {
    const hasConnection = await checkNetworkConnection();
    if (!hasConnection) {
      logger.captureMessage('[API] No network connection in background', 'warning');
      return { success: false, error: 'No network connection' };
    }

    logger.captureMessage(`[API] Background sync: sending ${venues.length} venues`, 'info');

    const response = await axios.post(API_URL, {
      venues: venues.map(v => ({
        id: v.id,
        name: v.name,
        latitude: v.latitude,
        longitude: v.longitude,
        createdAt: v.createdAt,
      })),
    }, {
      timeout: 8000,
    });

    if (response.status === 200 || response.status === 201) {
      logger.captureMessage('[API] Background sync successful', 'info');
      return { success: true };
    }

    return { success: false, error: `Server returned ${response.status}` };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        logger.captureMessage('[API] Background sync timeout', 'warning');
        return { success: false, error: 'Request timeout' };
      } else if (axiosError.code === 'ERR_NETWORK') {
        logger.captureMessage('[API] Background sync network error', 'warning');
        return { success: false, error: 'Network error' };
      }
    }
    logger.captureException(error, { where: 'sendVenuesBackground', venueCount: venues.length });
    return { success: false, error: 'Unknown error' };
  }
};

