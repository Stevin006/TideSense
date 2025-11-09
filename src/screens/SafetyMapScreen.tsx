import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import styled, { useTheme } from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type SafetyMapScreenProps = NativeStackScreenProps<RootStackParamList, 'SafetyMap'>;

interface MapLocation {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface SafetyMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  type: 'lifeguard' | 'danger' | 'safe' | 'user';
}

export const SafetyMapScreen = ({ navigation, route }: SafetyMapScreenProps) => {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<MapLocation | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [markers, setMarkers] = useState<SafetyMarker[]>([]);
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [showDangerZones, setShowDangerZones] = useState(true);

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show the map');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });

      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      // Generate sample safety markers around user location
      // In production, these would come from a real database
      const sampleMarkers: SafetyMarker[] = [
        {
          id: '1',
          latitude: latitude + 0.01,
          longitude: longitude + 0.01,
          title: 'Main Beach Lifeguard Station',
          description: 'On duty 9AM - 6PM daily',
          type: 'lifeguard',
        },
        {
          id: '2',
          latitude: latitude - 0.015,
          longitude: longitude + 0.005,
          title: 'South Beach Lifeguard',
          description: 'On duty 10AM - 5PM weekends',
          type: 'lifeguard',
        },
        {
          id: '3',
          latitude: latitude + 0.005,
          longitude: longitude - 0.02,
          title: 'Riptide Warning Area',
          description: 'Strong currents detected - swim with caution',
          type: 'danger',
        },
        {
          id: '4',
          latitude: latitude - 0.008,
          longitude: longitude - 0.01,
          title: 'Protected Swimming Area',
          description: 'Calm waters, ideal for families',
          type: 'safe',
        },
      ];

      setMarkers(sampleMarkers);
      setLoading(false);
    } catch (error) {
      console.error('Map initialization error:', error);
      Alert.alert('Error', 'Failed to load map');
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'lifeguard':
        return '#3B82F6'; // Blue
      case 'danger':
        return theme.colors.danger; // Red
      case 'safe':
        return theme.colors.success; // Green
      default:
        return theme.colors.primary;
    }
  };

  const getMarkerIcon = (type: string): any => {
    switch (type) {
      case 'lifeguard':
        return 'medical';
      case 'danger':
        return 'warning';
      case 'safe':
        return 'shield-checkmark';
      default:
        return 'location';
    }
  };

  if (loading || !region) {
    return (
      <Container edges={['top', 'left', 'right']}>
        <LoadingContainer>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <LoadingText>Loading map...</LoadingText>
        </LoadingContainer>
      </Container>
    );
  }

  return (
    <Container edges={['top', 'left', 'right']}>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </BackButton>
        <HeaderTitle>Safety Map</HeaderTitle>
        <LocationButton onPress={centerOnUser}>
          <Ionicons name="locate" size={24} color={theme.colors.textPrimary} />
        </LocationButton>
      </Header>

      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
      >
        {/* Safety markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={marker.description}
            pinColor={getMarkerColor(marker.type)}
          />
        ))}

        {/* Safe zones (green circles) */}
        {showSafeZones && markers
          .filter(m => m.type === 'safe')
          .map((marker) => (
            <Circle
              key={`safe-${marker.id}`}
              center={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              radius={500}
              fillColor="rgba(16, 185, 129, 0.15)"
              strokeColor="rgba(16, 185, 129, 0.5)"
              strokeWidth={2}
            />
          ))}

        {/* Danger zones (red circles) */}
        {showDangerZones && markers
          .filter(m => m.type === 'danger')
          .map((marker) => (
            <Circle
              key={`danger-${marker.id}`}
              center={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              radius={800}
              fillColor="rgba(239, 68, 68, 0.2)"
              strokeColor="rgba(239, 68, 68, 0.6)"
              strokeWidth={2}
            />
          ))}
      </MapView>

      {/* Legend */}
      <LegendCard>
        <LegendTitle>Map Legend</LegendTitle>
        <LegendRow>
          <LegendIcon style={{ backgroundColor: '#3B82F6' }}>
            <Ionicons name="medical" size={16} color="#FFF" />
          </LegendIcon>
          <LegendText>Lifeguard Station</LegendText>
        </LegendRow>
        <LegendRow>
          <LegendIcon style={{ backgroundColor: theme.colors.success }}>
            <Ionicons name="shield-checkmark" size={16} color="#FFF" />
          </LegendIcon>
          <LegendText>Safe Swimming Area</LegendText>
        </LegendRow>
        <LegendRow>
          <LegendIcon style={{ backgroundColor: theme.colors.danger }}>
            <Ionicons name="warning" size={16} color="#FFF" />
          </LegendIcon>
          <LegendText>Riptide Warning Area</LegendText>
        </LegendRow>
      </LegendCard>

      {/* Toggle Controls */}
      <ControlsCard>
        <ToggleRow>
          <ToggleLabel>Show Safe Zones</ToggleLabel>
          <ToggleButton
            active={showSafeZones}
            onPress={() => setShowSafeZones(!showSafeZones)}
          >
            <Ionicons
              name={showSafeZones ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={showSafeZones ? theme.colors.success : theme.colors.textSecondary}
            />
          </ToggleButton>
        </ToggleRow>
        <ToggleRow>
          <ToggleLabel>Show Danger Zones</ToggleLabel>
          <ToggleButton
            active={showDangerZones}
            onPress={() => setShowDangerZones(!showDangerZones)}
          >
            <Ionicons
              name={showDangerZones ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={showDangerZones ? theme.colors.danger : theme.colors.textSecondary}
            />
          </ToggleButton>
        </ToggleRow>
      </ControlsCard>
    </Container>
  );
};

// Styled Components
type ThemeProps = { theme: AppTheme };
const themed = <T,>(fn: (theme: AppTheme) => T) => ({ theme }: ThemeProps) => fn(theme);

const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${themed((theme) => theme.colors.background)};
`;

const Header = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
  border-bottom-width: 1px;
  border-bottom-color: ${themed((theme) => theme.colors.divider)};
  background-color: ${themed((theme) => theme.colors.background)};
`;

const BackButton = styled.TouchableOpacity`
  padding: 8px;
`;

const LocationButton = styled.TouchableOpacity`
  padding: 8px;
`;

const HeaderTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 20px;
  font-weight: 700;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  margin-top: 16px;
  font-size: 16px;
`;

const LegendCard = styled.View<ThemeProps>`
  position: absolute;
  top: 120px;
  right: 16px;
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 12px;
  padding: 16px;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 5;
`;

const LegendTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
`;

const LegendRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 8px;
`;

const LegendIcon = styled.View`
  width: 24px;
  height: 24px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
`;

const LegendText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 13px;
`;

const ControlsCard = styled.View<ThemeProps>`
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 12px;
  padding: 16px;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 5;
`;

const ToggleRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const ToggleLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 14px;
  font-weight: 500;
`;

const ToggleButton = styled.TouchableOpacity<{ active: boolean }>`
  padding: 4px;
`;
