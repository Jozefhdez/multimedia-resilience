import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Venue } from '../models/Venue';
import { loadAllVenues } from '../controllers/venueController';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function DatabaseScreen() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filter, setFilter] = useState<'all' | 'synced' | 'pending'>('all');

  useFocusEffect(
    useCallback(() => {
      loadVenues();
    }, [])
  );

  const loadVenues = async () => {
    const allVenues = await loadAllVenues();
    setVenues(allVenues);
  };

  const filteredVenues = venues.filter(venue => {
    if (filter === 'synced') return venue.synced;
    if (filter === 'pending') return !venue.synced;
    return true;
  });

  const syncedCount = venues.filter(v => v.synced).length;
  const pendingCount = venues.filter(v => !v.synced).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SQLite Database</Text>
        <Text style={styles.subtitle}>Table: Venues</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#007AFF' }]}>{venues.length}</Text>
          <Text style={styles.statLabel}>All</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{syncedCount}</Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'synced' && styles.filterButtonActive]}
          onPress={() => setFilter('synced')}
        >
          <Text style={[styles.filterText, filter === 'synced' && styles.filterTextActive]}>
            Synced
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.tableContainer} horizontal>
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.columnId]}>ID</Text>
            <Text style={[styles.tableHeaderText, styles.columnName]}>Venue Name</Text>
            <Text style={[styles.tableHeaderText, styles.columnCoord]}>Latitude</Text>
            <Text style={[styles.tableHeaderText, styles.columnCoord]}>Longitude</Text>
            <Text style={[styles.tableHeaderText, styles.columnStatus]}>Synced</Text>
          </View>

          <ScrollView>
            {filteredVenues.map((venue, index) => (
              <View
                key={venue.id}
                style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}
              >
                <Text style={[styles.tableCell, styles.columnId]}>{venue.id}</Text>
                <Text style={[styles.tableCell, styles.columnName]}>{venue.name}</Text>
                <Text style={[styles.tableCell, styles.columnCoord]}>
                  {venue.latitude.toFixed(6)}
                </Text>
                <Text style={[styles.tableCell, styles.columnCoord]}>
                  {venue.longitude.toFixed(6)}
                </Text>
                <Text style={[styles.tableCell, styles.columnStatus]}>
                  {venue.synced ? '✓' : '✗'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
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
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: 'white',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: 'white',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: 'white',
    marginTop: 5,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#FF9800',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2c3e50',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableRowEven: {
    backgroundColor: '#f9f9f9',
  },
  tableCell: {
    fontSize: 13,
    color: '#333',
  },
  columnId: {
    width: 60,
  },
  columnName: {
    width: 180,
  },
  columnCoord: {
    width: 110,
  },
  columnStatus: {
    width: 80,
    textAlign: 'center',
  },
});
