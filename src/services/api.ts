import axios, { AxiosError } from 'axios';
import { Venue } from '../models/Venue';

const API_URL = 'https://apiexample.com/';

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
    console.log('Network check failed:', error);
    return false;
  }
};

export const sendVenue = async (venue: Venue): Promise<boolean> => {
  try {
    console.log(`Attempting to sync venue: ${venue.name} (${venue.id})`);
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
    
    console.log(`Successfully synced venue: ${venue.name}`);
    return response.status === 200 || response.status === 201;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_NETWORK') {
        console.log(`Network error syncing venue ${venue.id}: No connection`);
      } else {
        console.error(`Error syncing venue ${venue.id}:`, axiosError.message);
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
    console.log('No network connection available. Skipping sync.');
    result.failedIds = venues.map(v => v.id);
    result.error = 'No network connection';
    return result;
  }

  console.log(`Starting sync of ${venues.length} venues...`);

  for (const venue of venues) {
    const success = await sendVenue(venue);
    if (success) {
      result.syncedIds.push(venue.id);
    } else {
      result.failedIds.push(venue.id);
    }
  }

  result.success = result.syncedIds.length > 0;
  console.log(`Sync complete: ${result.syncedIds.length} synced, ${result.failedIds.length} failed`);
  
  return result;
};

export const sendVenuesBackground = async (venues: Venue[]): Promise<BackgroundSyncResult> => {
  try {
    const hasConnection = await checkNetworkConnection();
    if (!hasConnection) {
      console.log('[API] No network connection in background');
      return { success: false, error: 'No network connection' };
    }

    console.log(`[API] Background sync: sending ${venues.length} venues`);

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
      console.log('[API] Background sync successful');
      return { success: true };
    }

    return { success: false, error: `Server returned ${response.status}` };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        console.log('[API] Background sync timeout');
        return { success: false, error: 'Request timeout' };
      } else if (axiosError.code === 'ERR_NETWORK') {
        console.log('[API] Background sync network error');
        return { success: false, error: 'Network error' };
      }
    }
    console.error('[API] Background sync failed:', error);
    return { success: false, error: 'Unknown error' };
  }
};
