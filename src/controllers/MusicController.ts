import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

function makeId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
import SONGS, { Song } from '../models/Songs';
import logger from '../utils/logger';

type TxStatus = 'pending' | 'success' | 'failed';

export type Transaction = {
  id: string;
  songId: string;
  status: TxStatus;
  attempts: number;
  lastError?: string;
  forceFail?: boolean;
  timestamp: number;
};

const STORAGE_KEY = 'music_transactions_v1';

class MusicController {
  private queue: Transaction[] = [];
  private processing = false;

  constructor() {
    this.loadQueue();
  }

  async loadQueue() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Transaction[] = JSON.parse(raw);
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.queue = parsed.filter(tx => {
          if (tx.status !== 'failed') return true;
          if (tx.timestamp < oneHourAgo) return false;
          return true;
        });
        await this.persistQueue();
      }
    } catch (e) {
      logger.captureException(e, { where: 'loadQueue' });
    }
  }

  async clearFailedTransactions() {
    this.queue = this.queue.filter(tx => tx.status !== 'failed');
    await this.persistQueue();
  }

  async clearAllTransactions() {
    this.queue = [];
    await this.persistQueue();
  }

  private async persistQueue() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      logger.captureException(e, { where: 'persistQueue' });
    }
  }

  getFailedTransactions(): Transaction[] {
    return this.queue.filter((t) => t.status === 'failed');
  }

  async enqueuePlay(songId: string, opts?: { forceFail?: boolean }) {
    const tx: Transaction = {
      id: makeId(),
      songId,
      status: 'pending',
      attempts: 0,
      forceFail: !!opts?.forceFail,
      timestamp: Date.now(),
    };
    this.queue.push(tx);
    await this.persistQueue();
    this.processQueue();
    return tx;
  }

  async retryTransaction(txId: string) {
    const tx = this.queue.find((t) => t.id === txId);
    if (!tx) return;
    tx.status = 'pending';
    tx.lastError = undefined;
    tx.attempts = 0;
    await this.persistQueue();
    this.processQueue();
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    while (true) {
      const next = this.queue.find((t) => t.status === 'pending');
      if (!next) break;
      try {
        await this.processTransaction(next);
      } catch (e) {
        logger.captureException(e, { where: 'processQueue' });
      }
    }
    this.processing = false;
  }

  private async processTransaction(tx: Transaction) {
    const song = SONGS.find((s) => s.id === tx.songId) as Song | undefined;
    if (!song) {
      tx.status = 'failed';
      tx.lastError = 'Song not found';
      await this.persistQueue();
      return;
    }

    const maxAttempts = 5;
    const baseDelay = 1000;

    while (tx.attempts < maxAttempts && tx.status === 'pending') {
      tx.attempts += 1;
      await this.persistQueue();
      try {
        if (tx.forceFail) {
          throw new Error('Forced failure for testing');
        }

        if ((song as any).corrupt) {
          throw new Error('Corrupt audio file - cannot load');
        }

        const { sound } = await Audio.Sound.createAsync(song.uri, {
          shouldPlay: false,
        });

        logger.captureMessage(`Loaded ${song.title}`, 'info');

        await sound.playAsync();

        tx.status = 'success';
        tx.lastError = undefined;
        await this.persistQueue();

        setTimeout(async () => {
          try {
            await sound.unloadAsync();
          } catch (e) {
            // ignore
          }
        }, 2000);

        Alert.alert('Playing', `${song.title} by ${song.artist}`);
        logger.captureMessage(`Playback success: ${song.title}`, 'info');
        return;
      } catch (err: any) {
        tx.lastError = err?.message || String(err);
        logger.captureException(err, { txId: tx.id, songId: tx.songId });
        if (tx.attempts >= maxAttempts) {
          tx.status = 'failed';
          await this.persistQueue();
          return;
        }
        const delay = baseDelay * Math.pow(2, tx.attempts - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
}

const controller = new MusicController();
export default controller;
