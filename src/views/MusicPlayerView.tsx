import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import SONGS, { Song } from '../models/Songs';
import controller, { Transaction } from '../controllers/MusicController';
import logger from '../utils/logger';
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeOffIcon,
  VolumeUpIcon,
  CloseIcon,
  MusicNoteIcon,
} from '../components/Icons';

export default function MusicPlayerView() {
  const [failed, setFailed] = useState<Transaction[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    logger.initSentry();
    refreshFailed();
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (sound) {
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    }
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying || false);
      
      if (status.didJustFinish && !status.isLooping) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const refreshFailed = () => {
    const f = controller.getFailedTransactions();
    setFailed(f);
  };

  const onSelectSong = async (song: Song) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      if (song.corrupt) {
        Alert.alert('Error', 'This audio file is corrupted and cannot be played');
        setFailed([...failed, {
          id: Date.now().toString(),
          songId: song.id,
          status: 'failed',
          attempts: 1,
          lastError: 'Corrupt audio file',
          timestamp: Date.now()
        }]);
        return;
      }

      setCurrentSong(song);
      setShowPlayer(true);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        song.uri,
        { shouldPlay: true, volume }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      
      logger.captureMessage(`Playing ${song.title}`, 'info');
    } catch (error) {
      Alert.alert('Error', 'Failed to load audio file');
      logger.captureException(error, { songId: song.id });
    }
  };

  const onPlayPause = async () => {
    if (!sound) return;
    
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const onSeek = async (value: number) => {
    if (!sound) return;
    await sound.setPositionAsync(value);
  };

  const onVolumeChange = async (value: number) => {
    setVolume(value);
    if (sound) {
      await sound.setVolumeAsync(value);
    }
  };

  const skipSeconds = async (seconds: number) => {
    if (!sound) return;
    const newPosition = Math.max(0, Math.min(duration, position + seconds * 1000));
    await sound.setPositionAsync(newPosition);
  };

  const closePlayer = () => {
    setShowPlayer(false);
  };

  const clearFailedTransactions = async () => {
    await controller.clearFailedTransactions();
    refreshFailed();
    Alert.alert('Success', 'Failed transactions cleared');
  };

  const clearSongError = async (song: Song) => {
    await controller.clearFailedTransactions();
    refreshFailed();
    await onSelectSong(song);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const successCount = SONGS.length - failed.filter(f => SONGS.some(s => s.id === f.songId)).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Music Player</Text>
      </View>

      {currentSong && showPlayer && (
        <View style={styles.playerContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={closePlayer}>
            <CloseIcon size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.albumArt}>
            <Image
              source={require('../../assets/images/cover_placeholder.jpg')}
              style={styles.albumArtImage}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.nowPlayingTitle}>{currentSong.title}</Text>
          <Text style={styles.nowPlayingArtist}>{currentSong.artist}</Text>

          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration}
              value={position}
              onSlidingComplete={onSeek}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#ddd"
              thumbTintColor="#007AFF"
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => skipSeconds(-10)}>
              <SkipBackIcon size={32} color="#333" />
              <Text style={styles.controlLabel}>-10s</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.playButton} onPress={onPlayPause}>
              {isPlaying ? (
                <PauseIcon size={30} color="white" />
              ) : (
                <PlayIcon size={30} color="white" />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={() => skipSeconds(10)}>
              <SkipForwardIcon size={32} color="#333" />
              <Text style={styles.controlLabel}>+10s</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.volumeContainer}>
            <VolumeOffIcon size={20} color="#666" />
            <Slider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={onVolumeChange}
              minimumTrackTintColor="#4CAF50"
              maximumTrackTintColor="#ddd"
              thumbTintColor="#4CAF50"
            />
            <VolumeUpIcon size={20} color="#666" />
            <Text style={styles.volumePercent}>{Math.round(volume * 100)}%</Text>
          </View>
        </View>
      )}

      {currentSong && !showPlayer && (
        <TouchableOpacity
          style={styles.miniPlayer}
          onPress={() => setShowPlayer(true)}
        >
          <View style={styles.miniPlayerIconContainer}>
            <MusicNoteIcon size={24} color="#007AFF" />
          </View>
          <View style={styles.miniPlayerInfo}>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={styles.miniPlayerArtist} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.miniPlayButton}
            onPress={(e) => {
              e.stopPropagation();
              onPlayPause();
            }}
          >
            {isPlaying ? (
              <PauseIcon size={20} color="white" />
            ) : (
              <PlayIcon size={20} color="white" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playlist</Text>
        <FlatList
          data={SONGS}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const isCurrentSong = currentSong?.id === item.id;
            const hasFailed = failed.some(f => f.songId === item.id);
            
            return (
              <TouchableOpacity
                style={[
                  styles.songCard,
                  isCurrentSong && styles.songCardActive,
                  hasFailed && styles.songCardError
                ]}
                onPress={() => onSelectSong(item)}
              >
                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, isCurrentSong && styles.songTitleActive]}>
                    {item.title}
                  </Text>
                  <Text style={styles.songArtist}>{item.artist}</Text>
                  {hasFailed && (
                    <TouchableOpacity onPress={() => clearSongError(item)}>
                      <Text style={styles.errorBadge}>
                        Playback Error - Tap to retry
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.songActions}>
                  {isCurrentSong && isPlaying ? (
                    <View style={styles.playingIndicator}>
                      <MusicNoteIcon size={20} color="white" />
                    </View>
                  ) : (
                    <View style={styles.playIndicator}>
                      <PlayIcon size={16} color="white" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    paddingVertical: 20,
    marginBottom: 10,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  clearLabel: {
    fontSize: 10,
    color: '#FF6B6B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  playerContainer: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  albumArt: {
    width: 200,
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    overflow: 'hidden',
  },
  albumArtImage: {
    width: '100%',
    height: '100%',
  },
  nowPlayingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  nowPlayingArtist: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  timeText: {
    color: '#666',
    fontSize: 12,
    width: 45,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 20,
  },
  controlButton: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 10,
  },
  volumePercent: {
    color: '#666',
    fontSize: 12,
    width: 45,
    textAlign: 'right',
  },
  miniPlayer: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  miniPlayerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  miniPlayerInfo: {
    flex: 1,
    marginRight: 10,
  },
  miniPlayerTitle: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  miniPlayerArtist: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  miniPlayButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    flex: 1,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  songCardActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  songCardError: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffcdd2',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  songTitleActive: {
    color: '#007AFF',
  },
  songArtist: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  errorBadge: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
  },
  songActions: {
    marginLeft: 10,
  },
  playIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
