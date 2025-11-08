import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Venue } from '../models/Venue';
import { addVenue, loadAllVenues, retryPendingSync } from '../controllers/venueController';

export default function HomeScreen() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [venueName, setVenueName] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadVenues();
    requestLocation();
  }, []);

  const loadVenues = async () => {
    const allVenues = await loadAllVenues();
    setVenues(allVenues);
    const pending = allVenues.filter(v => !v.synced).length;
    setPendingCount(pending);
  };

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      setMapRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleAddVenue = async () => {
    // Usar el centro del mapa en lugar de la ubicación actual
    if (!mapRegion) {
      Alert.alert('Error', 'Could not get map location');
      return;
    }

    if (!venueName.trim()) {
      Alert.alert('Error', 'Enter a name for the venue');
      return;
    }

    try {
      const newVenue = await addVenue(
        venueName.trim(),
        mapRegion.latitude,
        mapRegion.longitude
      );

      await loadVenues();
      setVenueName('');
      
      if (newVenue.synced) {
        Alert.alert('Success', 'Venue saved and synced');
      } else {
        Alert.alert('Success', 'Venue saved locally');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save venue');
    }
  };

  const handleSync = async () => {
    try {
      const result = await retryPendingSync();
      
      // Recargar venues después de sincronizar
      await loadVenues();
      
      if (result.synced === 0 && result.failed === 0) {
        Alert.alert('Info', 'No pending venues to sync');
      } else if (result.synced > 0 && result.failed === 0) {
        Alert.alert('Success', `${result.synced} venue(s) synchronized successfully!`);
      } else if (result.synced > 0 && result.failed > 0) {
        Alert.alert('Partial Success', `Synced: ${result.synced}\nFailed: ${result.failed}\n\nWill retry failed venues automatically.`);
      } else {
        Alert.alert('Sync Failed', 'Check your internet connection and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Sync failed. Please try again.');
    }
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onRegionChangeComplete={(region) => setMapRegion(region)}
      >
        {venues.map((venue) => (
          <Marker
            key={venue.id}
            coordinate={{
              latitude: venue.latitude,
              longitude: venue.longitude,
            }}
            title={venue.name}
            pinColor={venue.synced ? 'green' : 'red'}
          />
        ))}
      </MapView>
      
      <View style={styles.formContainer}>
        <Text style={styles.title}>Register Venue</Text>
        <Text style={styles.instruction}>
          Move the map to select location
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Venue name"
          value={venueName}
          onChangeText={setVenueName}
          placeholderTextColor="#999"
        />
        
        <TouchableOpacity style={styles.addButton} onPress={handleAddVenue}>
          <Text style={styles.addButtonText}>Add Venue Here</Text>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{venues.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Not synced</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -48,
    alignItems: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 15,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  syncButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
