import { Venue } from '../models/Venue';
import { saveVenue, getAllVenues, getPendingVenues, markAsSynced } from '../services/database';
import { syncVenues } from '../services/api';

export const addVenue = async (name: string, latitude: number, longitude: number): Promise<Venue> => {
  const newVenue: Venue = {
    id: Date.now().toString(),
    name,
    latitude,
    longitude,
    synced: false,
    createdAt: new Date().toISOString(),
  };
  
  await saveVenue(newVenue);
  
  try {
    const result = await syncVenues([newVenue]);
    if (result.success && result.syncedIds.includes(newVenue.id)) {
      await markAsSynced(newVenue.id);
      newVenue.synced = true;
      console.log(`[VenueController] Venue ${newVenue.id} synced immediately`);
    }
  } catch (error) {
    console.log('[VenueController] Immediate sync failed');
  }
  
  return newVenue;
};

export const loadAllVenues = async (): Promise<Venue[]> => {
  return await getAllVenues();
};

export const retryPendingSync = async (): Promise<{ synced: number; failed: number }> => {
  const pending = await getPendingVenues();
  
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }
  
  const result = await syncVenues(pending);
  
  for (const syncedId of result.syncedIds) {
    await markAsSynced(syncedId);
  }
  
  console.log(`[VenueController] Sync result: ${result.syncedIds.length} synced, ${result.failedIds.length} failed`);
  
  return { 
    synced: result.syncedIds.length, 
    failed: result.failedIds.length 
  };
};
