import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/services/database';
import { registerBackgroundSync } from './src/services/backgroundSync';
import HomeScreen from './src/views/HomeScreen';
import DatabaseScreen from './src/views/DatabaseScreen';
import MusicPlayerView from './src/views/MusicPlayerView';
import { HomeIcon, DatabaseIcon, MusicIcon } from './src/components/Icons';

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    const setup = async () => {
      try {
        console.log('[App] Initializing database...');
        await initDatabase();
        console.log('[App] Database initialized');
        
        console.log('[App] Registering background sync...');
        const registered = await registerBackgroundSync();
        if (registered) {
          console.log('[App] Background sync registered successfully');
        } else {
          console.warn('[App] Failed to register background sync');
        }
      } catch (error) {
        console.error('[App] Setup error:', error);
      }
    };
    setup();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#999',
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <HomeIcon size={24} color={color} />,
          }}
        />
        <Tab.Screen
          name="Database"
          component={DatabaseScreen}
          options={{
            tabBarLabel: 'Database',
            tabBarIcon: ({ color }) => <DatabaseIcon size={24} color={color} />,
          }}
        />
        <Tab.Screen
          name="Music"
          component={MusicPlayerView}
          options={{
            tabBarLabel: 'Music',
            tabBarIcon: ({ color }) => <MusicIcon size={24} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
