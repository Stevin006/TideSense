import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Animated, Easing, Share, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
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

// Backend API URL
// For Android emulator use 10.0.2.2, for iOS simulator/device use your local network IP
const API_BASE = Platform.OS === 'android' 
  ? 'http://10.0.2.2:8000' 
  : __DEV__ 
    ? 'http://10.14.31.26:8000'  // Your local network IP for real devices
    : 'http://127.0.0.1:8000';       // Fallback for production

export const ResultsScreen = ({ navigation, route }: ResultsScreenProps) => {
  const { result } = route.params;
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Location state
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // AI Summary state
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [bullets, setBullets] = useState<string[]>([]);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const player = useAudioPlayer(audioUrl || '');
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  // Auto-generate summary on mount
  useEffect(() => {
    handleGenerateSummary();
  }, []);

  // Auto-play when player is ready
  useEffect(() => {
    if (player && audioUrl && !player.playing && player.duration === 0) {
      // Player just loaded, try to play
      const attemptPlay = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          if (player && audioUrl) {
            player.play();
            setIsPlaying(true);
            console.log('Auto-play started');
          }
        } catch (err) {
          console.error('Auto-play failed:', err);
          setIsPlaying(false);
        }
      };
      attemptPlay();
    }
  }, [player, audioUrl]);

  // Monitor audio playback
  useEffect(() => {
    if (!player || !audioUrl) return;

    const interval = setInterval(() => {
      if (player.duration > 0) {
        const progress = player.currentTime / player.duration;
        setPlaybackProgress(progress);
        setPlaybackPosition(player.currentTime * 1000);
        setPlaybackDuration(player.duration * 1000);
        setIsPlaying(player.playing);

        if (progress >= 0.99 && player.playing === false) {
          setPlaybackProgress(0);
          setPlaybackPosition(0);
          setAudioUrl(null);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, audioUrl]);

  // Pulse animation for play button
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (summary && !isPlaying && !summaryLoading) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      );
      anim.start();
    }
    return () => {
      if (anim) anim.stop();
      pulse.setValue(1);
    };
  }, [summary, isPlaying, summaryLoading, pulse]);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 550,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Fetch location
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

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        if (mounted) setCoords({ latitude, longitude });

        const url = `https://api.weather.gov/points/${latitude},${longitude}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          if (mounted) setLocationName(null);
          return;
        }

        const data = await resp.json();
        const rel = data?.properties?.relativeLocation?.properties;
        const city = rel?.city;
        const state = rel?.state;
        if (mounted) setLocationName(city && state ? `${city}, ${state}` : null);
      } catch (err) {
        console.warn('[ResultsScreen] Location lookup failed', err);
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
    // Clean up audio before navigating
    if (player && audioUrl) {
      player.pause();
      setAudioUrl(null);
    }
    navigation.replace('Camera');
  };

  const handleShareAlert = async () => {
    const locationText = locationName || result.location || 'Unknown location';
    try {
      await Share.share({
        title: 'TideSense Alert',
        message:
          result.status === 'SAFE'
            ? `TideSense scan at ${locationText}: Safe to swim (${result.probability}% confidence).`
            : `⚠️ RIPTIDE DETECTED at ${locationText}. Probability ${result.probability}%. Stay out of the water and alert others!`,
      });
    } catch (error) {
      console.warn('Share failed', error);
    }
  };

  const handleGenerateSummary = async () => {
    if (summaryLoading || summary) return;

    setSummaryLoading(true);
    try {
      const response = await fetch(`${API_BASE}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detection: {
            status: result.status,
            probability: result.probability,
            timestamp: result.timestamp,
            location: locationName ? { name: locationName } : undefined,
            weatherAlerts: [],
            recommendations: result.recommendations || [],
          },
          history: [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary || 'Analysis complete.');
        setBullets(data.bullets || []);
      } else {
        setSummary('Unable to generate AI summary. Please try again.');
      }
    } catch (err) {
      console.warn('Summary generation failed:', err);
      setSummary('Summary unavailable (server offline).');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handlePlayAdvice = async () => {
    // Prevent multiple rapid clicks
    if (isPlaying && !audioUrl) {
      console.log('Already loading audio...');
      return;
    }

    // Build text to speak
    const textToSpeak = summary
      ? `${summary} ${bullets.join('. ')}`
      : result.recommendations.join('. ') || `${result.status}. Confidence: ${result.probability}%`;

    try {
      // If audio exists and player is ready, toggle pause
      if (audioUrl && player) {
        if (player.playing) {
          player.pause();
          setIsPlaying(false);
          return;
        } else {
          // Resume playback
          player.play();
          setIsPlaying(true);
          return;
        }
      }

      setIsPlaying(true);

      // Try ElevenLabs TTS via backend
      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak }),
      });

      if (!response.ok) {
        console.warn('TTS request failed:', response.status);
        setIsPlaying(false);
        // Fallback to device TTS
        Speech.speak(textToSpeak, {
          onDone: () => setIsPlaying(false),
          onStopped: () => setIsPlaying(false),
        });
        return;
      }

      const data = await response.json();
      if (data.tts_url) {
        const ttsUrl = data.tts_url.startsWith('http')
          ? data.tts_url
          : `${API_BASE}${data.tts_url}`;

        console.log('Setting audio URL:', ttsUrl);
        
        // Set audio URL - the useEffect will handle auto-playing
        setAudioUrl(ttsUrl);
      } else {
        console.warn('No tts_url in response');
        setIsPlaying(false);
        // Fallback to device TTS
        Speech.speak(textToSpeak, {
          onDone: () => setIsPlaying(false),
          onStopped: () => setIsPlaying(false),
        });
      }
    } catch (err) {
      console.error('Audio playback error:', err);
      setIsPlaying(false);
      // Final fallback to device TTS
      Speech.speak(textToSpeak, {
        onDone: () => setIsPlaying(false),
        onStopped: () => setIsPlaying(false),
      });
    }
  };

  return (
    <Container edges={['top', 'left', 'right']}>
      <ScrollContent
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
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
            <ProbabilityText>{result.probability}% confidence</ProbabilityText>
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
            <Ionicons name="location" size={18} color={theme.colors.textSecondary} />
            <LocationText>
              {isLocationLoading
                ? 'Locating...'
                : locationName || result.location || 'Unknown'}
            </LocationText>
            {coords && (
              <CoordsText>
                {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
              </CoordsText>
            )}
          </LocationTag>
        </AnimatedCard>

        {/* AI Summary Card */}
        {(summaryLoading || summary) && (
          <InfoCard>
            <CardTitleRow>
              <CardTitle>AI Analysis</CardTitle>
              {summaryLoading && (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              )}
            </CardTitleRow>

            {summaryLoading ? (
              <LoadingText>Generating AI summary...</LoadingText>
            ) : summary ? (
              <>
                <SummaryText>{summary}</SummaryText>
                {bullets.length > 0 && (
                  <BulletsContainer>
                    {bullets.map((bullet, idx) => (
                      <BulletRow key={idx}>
                        <BulletIcon>•</BulletIcon>
                        <BulletText>{bullet}</BulletText>
                      </BulletRow>
                    ))}
                  </BulletsContainer>
                )}
              </>
            ) : null}
          </InfoCard>
        )}

        {/* Water Conditions */}
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
          <Timestamp>
            Last scan • {new Date(result.timestamp).toLocaleTimeString()}
          </Timestamp>
        </InfoCard>

        {/* Safety Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <InfoCard>
            <CardTitle>Safety Recommendations</CardTitle>
            {result.recommendations.map((recommendation, index) => (
              <Recommendation key={index}>
                <Bullet>•</Bullet>
                <RecommendationText>{recommendation}</RecommendationText>
              </Recommendation>
            ))}
          </InfoCard>
        )}
      </ScrollContent>

      {/* Action Buttons */}
      <Actions>
        <ActionScroller>
          <ActionRow>
            <PrimaryButton onPress={handleScanAgain} activeOpacity={0.85}>
              <Ionicons name="camera" size={18} color={theme.colors.textPrimary} style={{ marginRight: 8 }} />
              <PrimaryButtonLabel>Scan Again</PrimaryButtonLabel>
            </PrimaryButton>

            {/* Play Audio Button with Pulse */}
            <AnimatedPlayButton
              onPress={handlePlayAdvice}
              disabled={summaryLoading}
              style={{ transform: [{ scale: pulse }] }}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color={theme.colors.textPrimary}
                style={{ marginRight: 8 }}
              />
              <SecondaryButtonLabel>
                {isPlaying ? 'Pause' : 'Play Audio'}
              </SecondaryButtonLabel>
            </AnimatedPlayButton>

            {result.status === 'UNSAFE' && (
              <SecondaryButton onPress={handleShareAlert} activeOpacity={0.85}>
                <Ionicons
                  name="share-social"
                  size={18}
                  color={theme.colors.danger}
                  style={{ marginRight: 8 }}
                />
                <AlertButtonLabel>Share Alert</AlertButtonLabel>
              </SecondaryButton>
            )}
          </ActionRow>
        </ActionScroller>

        {/* Audio Progress Bar */}
        {(isPlaying || playbackProgress > 0) && (
          <>
            <ProgressTrack>
              <ProgressFill progress={playbackProgress} />
            </ProgressTrack>
            <TimeRow>
              <PlaybackTime>{formatMs(playbackPosition)}</PlaybackTime>
              <PlaybackTime>{formatMs(playbackDuration)}</PlaybackTime>
            </TimeRow>
          </>
        )}
      </Actions>
    </Container>
  );
};

// Helper function
function formatMs(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Styled Components
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
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
  shadow-color: #000;
  shadow-opacity: 0.08;
  shadow-radius: 12px;
  shadow-offset: 0px 4px;
  elevation: 4;
`;

const StatusRow = styled.View<ThemeProps>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const StatusBadge = styled.View<ThemeProps & { color: string }>`
  padding: ${themed((theme) => `${theme.spacing(1)}px ${theme.spacing(2)}px`)};
  background-color: ${({ color }: { color: string }) => color}20;
  border-radius: ${themed((theme) => `${theme.radii.pill}px`)};
`;

const StatusBadgeText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const ProbabilityText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
  font-weight: 500;
`;

const IconWrapper = styled.View<ThemeProps & { color: string }>`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  background-color: ${({ color }: { color: string }) => color}15;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin: ${themed((theme) => `${theme.spacing(4)}px 0`)};
`;

const Headline = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  margin-bottom: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const Subtext = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 15px;
  text-align: center;
  line-height: 22px;
  margin-bottom: ${themed((theme) => `${theme.spacing(3)}px`)};
`;

const LocationTag = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${themed((theme) => `${theme.spacing(1)}px`)};
  padding: ${themed((theme) => `${theme.spacing(2)}px`)};
  background-color: ${themed((theme) => theme.colors.divider)}40;
  border-radius: ${themed((theme) => `${theme.radii.md}px`)};
`;

const LocationText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
  font-weight: 500;
`;

const CoordsText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 11px;
  font-weight: 400;
  opacity: 0.7;
`;

const InfoCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: ${themed((theme) => `${theme.radii.lg}px`)};
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
  margin-bottom: ${themed((theme) => `${theme.spacing(2)}px`)};
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const CardTitleRow = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const CardTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 16px;
  font-weight: 600;
  margin-bottom: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const LoadingText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
  font-style: italic;
`;

const SummaryText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 15px;
  line-height: 22px;
  margin-bottom: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const BulletsContainer = styled.View<ThemeProps>`
  margin-top: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const BulletRow = styled.View<ThemeProps>`
  flex-direction: row;
  margin-bottom: ${themed((theme) => `${theme.spacing(1.5)}px`)};
`;

const BulletIcon = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.primary)};
  font-size: 18px;
  margin-right: ${themed((theme) => `${theme.spacing(2)}px`)};
  font-weight: 700;
`;

const BulletText = styled.Text<ThemeProps>`
  flex: 1;
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
  line-height: 20px;
`;

const DetailRow = styled.View<ThemeProps>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${themed((theme) => `${theme.spacing(1.5)}px 0`)};
`;

const Label = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
`;

const Value = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 14px;
  font-weight: 600;
`;

const Divider = styled.View<ThemeProps>`
  height: 1px;
  background-color: ${themed((theme) => theme.colors.divider)};
  margin: ${themed((theme) => `${theme.spacing(1)}px 0`)};
`;

const Timestamp = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 12px;
  margin-top: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const Recommendation = styled.View<ThemeProps>`
  flex-direction: row;
  margin-bottom: ${themed((theme) => `${theme.spacing(1.5)}px`)};
`;

const Bullet = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.primary)};
  font-size: 18px;
  margin-right: ${themed((theme) => `${theme.spacing(2)}px`)};
  font-weight: 700;
`;

const RecommendationText = styled.Text<ThemeProps>`
  flex: 1;
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
  line-height: 20px;
`;

const Actions = styled.View<ThemeProps>`
  padding: ${themed((theme) => `${theme.spacing(2)}px 0`)};
  border-top-width: 1px;
  border-top-color: ${themed((theme) => theme.colors.divider)};
`;

const ActionScroller = styled.ScrollView.attrs(() => ({
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  contentContainerStyle: { alignItems: 'center', gap: 12 },
}))<ThemeProps>`
  width: 100%;
`;

const ActionRow = styled.View<ThemeProps>`
  flex-direction: row;
  gap: ${themed((theme) => `${theme.spacing(2)}px`)};
  align-items: center;
`;

const buttonBase = css`
  padding: ${themed((theme) => `${theme.spacing(2)}px ${theme.spacing(3)}px`)};
  border-radius: ${themed((theme) => `${theme.radii.md}px`)};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  min-width: 130px;
`;

const PrimaryButton = styled.TouchableOpacity<ThemeProps>`
  ${buttonBase}
  background-color: ${themed((theme) => theme.colors.primary)};
`;

const PrimaryButtonLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 15px;
  font-weight: 600;
`;

const SecondaryButton = styled.TouchableOpacity<ThemeProps>`
  ${buttonBase}
  background-color: rgba(255, 255, 255, 0.05);
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const SecondaryButtonLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 15px;
  font-weight: 600;
`;

const AlertButtonLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.danger)};
  font-size: 15px;
  font-weight: 600;
`;

const AnimatedPlayButton = Animated.createAnimatedComponent(SecondaryButton as any);

const ProgressTrack = styled.View<ThemeProps>`
  height: 4px;
  background-color: ${themed((theme) => theme.colors.divider)};
  border-radius: 4px;
  overflow: hidden;
  margin-top: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const ProgressFill = styled.View<ThemeProps & { progress: number }>`
  height: 100%;
  background-color: ${themed((theme) => theme.colors.primary)};
  width: ${({ progress }: { progress: number }) => `${Math.round(progress * 100)}%`};
`;

const TimeRow = styled.View<ThemeProps>`
  flex-direction: row;
  justify-content: space-between;
  margin-top: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const PlaybackTime = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 12px;
`;
