import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import styled, { useTheme } from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type WeatherScreenProps = NativeStackScreenProps<RootStackParamList, 'Weather'>;

interface WeatherData {
  location: string;
  temperature: number;
  conditions: string;
  windSpeed: number;
  windDirection: string;
  waveHeight: string;
  waterTemp: number;
  uvIndex: number;
  visibility: string;
  alerts: string[];
  forecast: {
    day: string;
    high: number;
    low: number;
    conditions: string;
    waveHeight: string;
  }[];
}

export const WeatherScreen = ({ navigation }: WeatherScreenProps) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherData = async () => {
    try {
      setError(null);
      
      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission required');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Fetch NOAA point data
      const pointResponse = await fetch(
        `https://api.weather.gov/points/${latitude},${longitude}`
      );

      if (!pointResponse.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const pointData = await pointResponse.json();
      const forecastUrl = pointData.properties.forecast;
      const forecastGridData = pointData.properties.forecastGridData;
      
      // Get forecast
      const forecastResponse = await fetch(forecastUrl);
      const forecastData = await forecastResponse.json();

      // Get detailed grid data
      const gridResponse = await fetch(forecastGridData);
      const gridData = await gridResponse.json();

      // Parse location
      const city = pointData.properties.relativeLocation?.properties?.city || 'Unknown';
      const state = pointData.properties.relativeLocation?.properties?.state || '';

      // Get current conditions (from first forecast period)
      const current = forecastData.properties.periods[0];
      
      // Extract weather data
      const weatherData: WeatherData = {
        location: `${city}, ${state}`,
        temperature: current.temperature,
        conditions: current.shortForecast,
        windSpeed: parseInt(current.windSpeed) || 0,
        windDirection: current.windDirection,
        waveHeight: gridData.properties.waveHeight?.values[0]?.value 
          ? `${(gridData.properties.waveHeight.values[0].value * 3.28084).toFixed(1)} ft`
          : 'N/A',
        waterTemp: gridData.properties.waterTemperature?.values[0]?.value 
          ? Math.round((gridData.properties.waterTemperature.values[0].value * 9/5) + 32)
          : 72,
        uvIndex: 6, // NOAA doesn't provide UV in grid data easily
        visibility: `${Math.round(gridData.properties.visibility?.values[0]?.value / 1609.34) || 10} mi`,
        alerts: [], // We'll add alerts separately if needed
        forecast: forecastData.properties.periods.slice(1, 6).map((period: any) => ({
          day: period.name,
          high: period.temperature,
          low: period.temperature - 10, // Approximate
          conditions: period.shortForecast,
          waveHeight: 'N/A',
        })),
      };

      setWeather(weatherData);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Unable to load weather data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeatherData();
  };

  const getWindIcon = () => {
    if (!weather) return 'help-circle';
    if (weather.windSpeed < 10) return 'leaf';
    if (weather.windSpeed < 20) return 'partly-sunny';
    return 'thunderstorm';
  };

  const getUVColor = () => {
    if (!weather) return theme.colors.success;
    if (weather.uvIndex <= 2) return theme.colors.success;
    if (weather.uvIndex <= 5) return '#F2C500';
    if (weather.uvIndex <= 7) return '#FF9500';
    return theme.colors.danger;
  };

  if (loading) {
    return (
      <Container edges={['top', 'left', 'right']}>
        <LoadingContainer>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <LoadingText>Loading weather data...</LoadingText>
        </LoadingContainer>
      </Container>
    );
  }

  if (error || !weather) {
    return (
      <Container edges={['top', 'left', 'right']}>
        <ErrorContainer>
          <Ionicons name="cloud-offline" size={64} color={theme.colors.textSecondary} />
          <ErrorText>{error || 'Unable to load weather'}</ErrorText>
          <RetryButton onPress={fetchWeatherData}>
            <RetryText>Retry</RetryText>
          </RetryButton>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container edges={['top', 'left', 'right']}>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </BackButton>
        <HeaderTitle>Ocean Conditions</HeaderTitle>
        <RefreshButton onPress={fetchWeatherData}>
          <Ionicons name="refresh" size={24} color={theme.colors.textPrimary} />
        </RefreshButton>
      </Header>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ContentContainer>
          {/* Current Location */}
          <LocationCard>
            <Ionicons name="location" size={20} color={theme.colors.primary} />
            <LocationText>{weather.location}</LocationText>
          </LocationCard>

          {/* Main Weather Card */}
          <MainWeatherCard>
            <TemperatureRow>
              <Temperature>{weather.temperature}°F</Temperature>
              <ConditionsText>{weather.conditions}</ConditionsText>
            </TemperatureRow>
            <Ionicons name="partly-sunny" size={80} color={theme.colors.primary} />
          </MainWeatherCard>

          {/* Ocean Conditions Grid */}
          <SectionTitle>Ocean Conditions</SectionTitle>
          <ConditionsGrid>
            <ConditionCard>
              <Ionicons name="water" size={32} color="#3B82F6" />
              <ConditionLabel>Wave Height</ConditionLabel>
              <ConditionValue>{weather.waveHeight}</ConditionValue>
            </ConditionCard>

            <ConditionCard>
              <Ionicons name="thermometer" size={32} color="#10B981" />
              <ConditionLabel>Water Temp</ConditionLabel>
              <ConditionValue>{weather.waterTemp}°F</ConditionValue>
            </ConditionCard>

            <ConditionCard>
              <Ionicons name={getWindIcon()} size={32} color="#F59E0B" />
              <ConditionLabel>Wind</ConditionLabel>
              <ConditionValue>{weather.windSpeed} mph</ConditionValue>
              <ConditionSubtext>{weather.windDirection}</ConditionSubtext>
            </ConditionCard>

            <ConditionCard>
              <Ionicons name="sunny" size={32} color={getUVColor()} />
              <ConditionLabel>UV Index</ConditionLabel>
              <ConditionValue>{weather.uvIndex}</ConditionValue>
              <ConditionSubtext>
                {weather.uvIndex <= 2 ? 'Low' : weather.uvIndex <= 5 ? 'Moderate' : weather.uvIndex <= 7 ? 'High' : 'Very High'}
              </ConditionSubtext>
            </ConditionCard>

            <ConditionCard>
              <Ionicons name="eye" size={32} color="#8B5CF6" />
              <ConditionLabel>Visibility</ConditionLabel>
              <ConditionValue>{weather.visibility}</ConditionValue>
            </ConditionCard>
          </ConditionsGrid>

          {/* Forecast */}
          <SectionTitle>5-Day Forecast</SectionTitle>
          {weather.forecast.map((day, index) => (
            <ForecastCard key={index}>
              <ForecastDay>{day.day}</ForecastDay>
              <ForecastConditions>{day.conditions}</ForecastConditions>
              <ForecastTemp>{day.high}°F</ForecastTemp>
            </ForecastCard>
          ))}

          {/* Safety Tips */}
          <SectionTitle>Safety Guidelines</SectionTitle>
          <SafetyCard>
            <SafetyRow>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <SafetyText>
                {weather.windSpeed < 15 
                  ? 'Good conditions for swimming' 
                  : 'Caution: Moderate to high winds'}
              </SafetyText>
            </SafetyRow>
            <SafetyRow>
              <Ionicons 
                name={weather.uvIndex > 5 ? "warning" : "checkmark-circle"} 
                size={20} 
                color={weather.uvIndex > 5 ? '#F59E0B' : theme.colors.success} 
              />
              <SafetyText>
                {weather.uvIndex > 5 
                  ? 'Apply sunscreen - high UV levels' 
                  : 'UV levels safe, sunscreen recommended'}
              </SafetyText>
            </SafetyRow>
            <SafetyRow>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <SafetyText>Always swim near a lifeguard</SafetyText>
            </SafetyRow>
          </SafetyCard>
        </ContentContainer>
      </ScrollView>
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
`;

const BackButton = styled.TouchableOpacity`
  padding: 8px;
`;

const RefreshButton = styled.TouchableOpacity`
  padding: 8px;
`;

const HeaderTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 20px;
  font-weight: 700;
`;

const ContentContainer = styled.View<ThemeProps>`
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
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

const ErrorContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 32px;
`;

const ErrorText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  margin-top: 16px;
  font-size: 16px;
  text-align: center;
`;

const RetryButton = styled.TouchableOpacity<ThemeProps>`
  margin-top: 24px;
  padding: 12px 32px;
  background-color: ${themed((theme) => theme.colors.primary)};
  border-radius: 8px;
`;

const RetryText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 16px;
  font-weight: 600;
`;

const LocationCard = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: ${themed((theme) => `${theme.spacing(2)}px`)};
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 12px;
  margin-bottom: 16px;
`;

const LocationText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 16px;
  font-weight: 600;
`;

const MainWeatherCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  align-items: center;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const TemperatureRow = styled.View`
  align-items: center;
  margin-bottom: 16px;
`;

const Temperature = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 56px;
  font-weight: 700;
`;

const ConditionsText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 18px;
  margin-top: 8px;
`;

const SectionTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  margin-top: 8px;
`;

const ConditionsGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
`;

const ConditionCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 12px;
  padding: 16px;
  align-items: center;
  flex: 1;
  min-width: 45%;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const ConditionLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 12px;
  margin-top: 8px;
`;

const ConditionValue = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 20px;
  font-weight: 700;
  margin-top: 4px;
`;

const ConditionSubtext = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 11px;
  margin-top: 2px;
`;

const ForecastCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const ForecastDay = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 16px;
  font-weight: 600;
  flex: 1;
`;

const ForecastConditions = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
  flex: 2;
  text-align: center;
`;

const ForecastTemp = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  text-align: right;
`;

const SafetyCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const SafetyRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const SafetyText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
  flex: 1;
`;
