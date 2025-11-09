import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { WeatherScreen } from '../screens/WeatherScreen';
import { SafetyMapScreen } from '../screens/SafetyMapScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'fade',
      animationDuration: 300
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Camera" component={CameraScreen} />
    <Stack.Screen name="Results" component={ResultsScreen} />
    <Stack.Screen name="History" component={HistoryScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="Weather" component={WeatherScreen} />
    <Stack.Screen name="SafetyMap" component={SafetyMapScreen} />
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
  </Stack.Navigator>
);

