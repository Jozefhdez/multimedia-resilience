import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { getPendingVenues, markAsSynced } from './database';
import { sendVenuesBackground } from './api';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_VENUE_SYNC_TASK';
const MAX_BATCH_SIZE = 10;

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Starting background sync...');
    
    const pendingVenues = await getPendingVenues();
    
    if (pendingVenues.length === 0) {
      console.log('[BackgroundSync] No pending venues to sync');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    console.log(`[BackgroundSync] Found ${pendingVenues.length} pending venues`);
    
    const batch = pendingVenues.slice(0, MAX_BATCH_SIZE);
    console.log(`[BackgroundSync] Syncing batch of ${batch.length} venues`);
    
    const result = await sendVenuesBackground(batch);
    
    if (result.success) {
      for (const venue of batch) {
        await markAsSynced(venue.id);
      }
      
      console.log(`[BackgroundSync] Successfully synced ${batch.length} venues`);
      
      if (pendingVenues.length > MAX_BATCH_SIZE) {
        console.log(`[BackgroundSync] ${pendingVenues.length - MAX_BATCH_SIZE} venues remaining for next sync`);
      }
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.error(`[BackgroundSync] Sync failed: ${result.error}`);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
  } catch (error) {
    console.error('[BackgroundSync] Unexpected error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundSync = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (isRegistered) {
      console.log('[BackgroundSync] Task already registered');
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    }
    
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutos
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('[BackgroundSync] Background sync registered successfully');
    
    const status = await BackgroundFetch.getStatusAsync();
    console.log('[BackgroundSync] BackgroundFetch status:', status);
    
    return true;
  } catch (err) {
    console.error('[BackgroundSync] Failed to register background sync:', err);
    return false;
  }
};

export const unregisterBackgroundSync = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  } catch (err) {
    console.error('[BackgroundSync] Failed to unregister:', err);
  }
};

export const checkBackgroundSyncStatus = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    const status = await BackgroundFetch.getStatusAsync();
    
    return {
      isRegistered,
      status,
      statusText: status !== null ? getStatusText(status) : 'Unknown',
    };
  } catch (err) {
    console.error('[BackgroundSync] Failed to check status:', err);
    return null;
  }
};

const getStatusText = (status: BackgroundFetch.BackgroundFetchStatus) => {
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return 'Available';
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return 'Denied - User disabled background refresh';
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return 'Restricted - Background refresh unavailable';
    default:
      return 'Unknown';
  }
};

export const testBackgroundSync = async () => {
  try {
    const pendingVenues = await getPendingVenues();
    
    if (pendingVenues.length === 0) {
      console.log('[BackgroundSync TEST] No pending venues');
      return { success: true, message: 'No pending venues to sync', synced: 0 };
    }
    
    const batch = pendingVenues.slice(0, MAX_BATCH_SIZE);
    const result = await sendVenuesBackground(batch);
    
    if (result.success) {
      for (const venue of batch) {
        await markAsSynced(venue.id);
      }
      
      console.log(`[BackgroundSync TEST] Successfully synced ${batch.length} venues`);
      return { 
        success: true, 
        message: `Successfully synced ${batch.length} venues`, 
        synced: batch.length,
        remaining: pendingVenues.length - batch.length
      };
    } else {
      console.error(`[BackgroundSync TEST] Sync failed: ${result.error}`);
      return { 
        success: false, 
        message: `Sync failed: ${result.error}`,
        synced: 0
      };
    }
  } catch (error: any) {
    console.error('[BackgroundSync TEST] Error:', error);
    return { 
      success: false, 
      message: error.message || 'Unknown error',
      synced: 0
    };
  }
};
