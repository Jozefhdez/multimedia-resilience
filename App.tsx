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
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://f669a3a14a677e0d7a32adc740f9b74e@o4510346645405696.ingest.us.sentry.io/4510346646061056',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const Tab = createBottomTabNavigator();

export default Sentry.wrap(function App() {
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
        Sentry.captureException(error);
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
});