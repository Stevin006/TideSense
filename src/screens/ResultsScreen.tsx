import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Animated, Easing, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import styled, { css, useTheme } from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';

import type { RootStackParamList } from '../navigation/types';
import type { DetectionStatus } from '../types/detection';

type ResultsScreenProps = NativeStackScreenProps<RootStackParamList, 'Results'>;

type IconName = ComponentProps<typeof Ionicons>['name'];

const STATUS_CONTENT: Record<
  DetectionStatus,
  { headline: string; subtext: string; icon: IconName }
> = {
  SAFE: {
    headline: 'Safe to Swim',
    subtext: 'No hazardous currents detected in the last scan.',
    icon: 'shield-checkmark',
  },
  UNSAFE: {
    headline: 'Riptide Detected — Stay Out',
    subtext: 'Dangerous current signature spotted. Keep clear of the water.',
    icon: 'warning',
  },
};

export const ResultsScreen = ({ navigation, route }: ResultsScreenProps) => {
  const { result } = route.params;
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    let mounted = true;

    const fetchPointLocation = async () => {
      setIsLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) setLocationName(null);
          return;
        }

  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = loc.coords;
  if (mounted) setCoords({ latitude, longitude });
  const url = `https://api.weather.gov/points/${latitude},${longitude}`;
  console.log('[ResultsScreen] NWS points request:', url);
  const resp = await fetch(url);
        if (!resp.ok) {
          if (mounted) setLocationName(null);
          return;
        }

  const data = await resp.json();
  console.log('[ResultsScreen] NWS points response:', data?.properties?.relativeLocation?.properties);
  const rel = data?.properties?.relativeLocation?.properties;
        const city = rel?.city;
        const state = rel?.state;
        if (mounted) setLocationName(city && state ? `${city}, ${state}` : null);
      } catch (err) {
        console.warn('[ResultsScreen] points lookup failed', err);
        if (mounted) setLocationName(null);
      } finally {
        if (mounted) setIsLocationLoading(false);
      }
    };

    fetchPointLocation();

    return () => {
      mounted = false;
    };
  }, []);

  const statusVisuals = useMemo(() => {
    const isSafe = result.status === 'SAFE';
    return {
      ...STATUS_CONTENT[result.status],
      color: isSafe ? theme.colors.success : theme.colors.danger,
      accent: isSafe ? theme.colors.primary : theme.colors.warning,
    };
  }, [result.status, theme.colors]);

  const handleScanAgain = () => {
    navigation.replace('Camera');
  };

  const handleShareAlert = async () => {
    try {
      await Share.share({
        title: 'RipTide Guard Alert',
        message:
          result.status === 'SAFE'
            ? `RipTide Guard scan at ${result.location}: Safe to swim with only a ${result.probability}% riptide probability.`
            : `RipTide Guard detected a riptide at ${result.location}. Probability ${result.probability}%. Stay out of the water and alert others.`,
      });
    } catch (error) {
      console.warn('Share failed', error);
    }
  };

  return (
    <Container edges={['top', 'left', 'right']}>
      <ScrollContent contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <AnimatedCard
          style={{
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          }}
        >
          <StatusRow>
            <StatusBadge color={statusVisuals.color}>
              <StatusBadgeText>{result.status}</StatusBadgeText>
            </StatusBadge>
            <ProbabilityText>{result.probability}% probability</ProbabilityText>
          </StatusRow>
          <IconWrapper color={statusVisuals.accent}>
            <Ionicons
              name={statusVisuals.icon}
              size={64}
              color={theme.colors.textPrimary}
            />
          </IconWrapper>
          <Headline>{statusVisuals.headline}</Headline>
          <Subtext>{statusVisuals.subtext}</Subtext>
          <LocationTag>
            <Ionicons
              name="location"
              size={18}
              color={theme.colors.textSecondary}
            />
            <LocationText>{locationName ?? result.location}</LocationText>
            {coords && (
              <CoordsText>
                {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              </CoordsText>
            )}
          </LocationTag>
        </AnimatedCard>

        <InfoCard>
          <CardTitle>Water Conditions</CardTitle>
          <DetailRow>
            <Label>Wave height</Label>
            <Value>{result.waveHeight}</Value>
          </DetailRow>
          <Divider />
          <DetailRow>
            <Label>Current strength</Label>
            <Value>{result.currentStrength}</Value>
          </DetailRow>
          <Timestamp>Last scan • {new Date(result.timestamp).toLocaleTimeString()}</Timestamp>
        </InfoCard>

        <InfoCard>
          <CardTitle>Safety Recommendations</CardTitle>
          {result.recommendations.map((recommendation, index) => (
            <Recommendation key={recommendation}>
              <Bullet>•</Bullet>
              <RecommendationText>{recommendation}</RecommendationText>
            </Recommendation>
          ))}
        </InfoCard>
      </ScrollContent>

      <Actions>
        <ActionRow>
          <PrimaryButton onPress={handleScanAgain} activeOpacity={0.85}>
            <PrimaryButtonLabel>Scan Again</PrimaryButtonLabel>
          </PrimaryButton>
          {result.status === 'UNSAFE' && (
            <SecondaryButton onPress={handleShareAlert} activeOpacity={0.85}>
              <SecondaryButtonLabel>Share Alert</SecondaryButtonLabel>
            </SecondaryButton>
          )}
        </ActionRow>
      </Actions>
    </Container>
  );
};

type ThemeProps = { theme: AppTheme };

const themed =
  <T,>(fn: (theme: AppTheme) => T) =>
  ({ theme }: ThemeProps) =>
    fn(theme);

const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${themed((theme) => theme.colors.background)};
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
`;

const ScrollContent = styled.ScrollView<ThemeProps>`
  flex: 1;
`;

const AnimatedCard = styled(Animated.View)<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: ${themed((theme) => `${theme.radii.lg}px`)};
  padding: ${themed((theme) => `${theme.spacing(4)}px`)};
  margin-bottom: ${themed((theme) => `${theme.spacing(3)}px`)};
  /* soft outline + shadow for a calm, tactile card */
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
  shadow-color: #000;
  shadow-opacity: 0.06;
  shadow-radius: 10px;
  shadow-offset: 0px 6px;
  elevation: 3;
`;

const StatusRow = styled.View<ThemeProps>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const StatusBadge = styled.View<ThemeProps & { color: string }>`
  padding: ${themed(
    (theme) => `${theme.spacing(1)}px ${theme.spacing(2)}px`,
  )};
  border-radius: ${themed((theme) => `${theme.radii.pill}px`)};
  background-color: ${({ color }: { color: string }) => color};
`;

const StatusBadgeText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.4px;
`;

const ProbabilityText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 16px;
  font-weight: 500;
`;

const IconWrapper = styled.View<ThemeProps & { color: string }>`
  width: 88px;
  height: 88px;
  border-radius: 44px;
  background-color: ${({ color }: { color: string }) => color};
  align-self: center;
  align-items: center;
  justify-content: center;
  margin-vertical: ${themed((theme) => `${theme.spacing(3)}px`)};
  border-width: 1px;
  border-color: rgba(255,255,255,0.06);
  shadow-color: #000;
  shadow-opacity: 0.08;
  shadow-radius: 8px;
  shadow-offset: 0px 4px;
  elevation: 2;
`;

const Headline = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  line-height: 30px;
`;

const Subtext = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 15px;
  text-align: center;
  margin-top: ${themed((theme) => `${theme.spacing(2)}px`)};
  line-height: 24px;
`;

const LocationTag = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: ${themed((theme) => `${theme.spacing(3)}px`)};
  gap: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const LocationText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 15px;
`;

const CoordsText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 12px;
  margin-top: ${themed((theme) => `${theme.spacing(0.5)}px`)};
`;

const InfoCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: ${themed((theme) => `${theme.radii.lg}px`)};
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
  margin-bottom: ${themed((theme) => `${theme.spacing(2)}px`)};
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
  shadow-color: #000;
  shadow-opacity: 0.04;
  shadow-radius: 8px;
  shadow-offset: 0px 4px;
  elevation: 1;
`;

const CardTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 18px;
  font-weight: 600;
  margin-bottom: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const DetailRow = styled.View<ThemeProps>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const Label = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 15px;
`;

const Value = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 16px;
  font-weight: 600;
`;

const Divider = styled.View<ThemeProps>`
  height: 1px;
  background-color: ${themed((theme) => theme.colors.divider)};
  margin-vertical: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const Timestamp = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 13px;
  margin-top: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const Recommendation = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const Bullet = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 16px;
  margin-right: ${themed((theme) => `${theme.spacing(1)}px`)};
  line-height: 22px;
`;

const RecommendationText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 15px;
  line-height: 22px;
  flex: 1;
`;

const Actions = styled.View<ThemeProps>`
  padding: ${themed((theme) => `${theme.spacing(2)}px 0`)};
  margin-top: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const ActionRow = styled.View<ThemeProps>`
  flex-direction: row;
  gap: ${themed((theme) => `${theme.spacing(2)}px`)};
  justify-content: space-between;
  align-items: center;
`;

const buttonBase = css`
  padding: ${themed(
    (theme) => `${theme.spacing(2)}px ${theme.spacing(3)}px`,
  )};
  border-radius: ${themed((theme) => `${theme.radii.pill}px`)};
  align-items: center;
  justify-content: center;
`;

const PrimaryButton = styled.TouchableOpacity<ThemeProps>`
  ${buttonBase}
  background-color: ${themed((theme) => theme.colors.primary)};
  shadow-color: #000;
  shadow-opacity: 0.12;
  shadow-radius: 12px;
  shadow-offset: 0px 8px;
  elevation: 4;
`;

const PrimaryButtonLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 18px;
  font-weight: 600;
`;

const SecondaryButton = styled.TouchableOpacity<ThemeProps>`
  ${buttonBase}
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
  background-color: transparent;
  min-width: 140px;
`;

const SecondaryButtonLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.warning)};
  font-size: 16px;
  font-weight: 600;
`;

