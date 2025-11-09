import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform , Modal, Animated, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import styled from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { generateMockDetectionResult } from '../utils/mockDetection';

type CameraScreenProps = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export const CameraScreen = ({ navigation }: CameraScreenProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const detectionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef<any>(null);

  const [riskLevel, setRiskLevel] = useState<'low' | 'moderate' | 'high' | 'unknown'>('unknown');
  const [isRiskLoading, setIsRiskLoading] = useState(true);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      setIsCameraActive(true);
      return () => setIsCameraActive(false);
    }, []),
  );

  useEffect(
    () => () => {
      if (detectionTimeout.current) {
        clearTimeout(detectionTimeout.current);
      }
    },
    [],
  );

  // Use your Mac's local IP for physical devices/Expo Go
  // For Android emulator: 10.0.2.2, For iOS simulator: localhost
  // For physical devices: your Mac's IP address on local network
  const SERVER_URL = Platform.OS === 'android' && !__DEV__ 
    ? 'http://10.0.2.2:8000' 
    : 'http://10.14.31.26:8000';

  const captureAndInfer = async () => {
    if (isDetecting) return;
    setIsDetecting(true);

    try {
      if (!cameraRef.current) {
        throw new Error('Camera not ready');
      }

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: false });
      const uri = photo?.uri;

      if (!uri) throw new Error('Failed to capture photo');

      // Upload to backend inference endpoint
      const form = new FormData();
      // @ts-ignore - React Native FormData file
      form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' });

      const resp = await fetch(`${SERVER_URL}/infer`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: form as any,
      });

      if (!resp.ok) {
        throw new Error(`Server inference failed: ${resp.status}`);
      }

      const result = await resp.json();
      setIsDetecting(false);
      navigation.navigate('Results', { result });
      return;

    } catch (err: any) {
      // Fallback to local mock detection for quick dev feedback
      console.log('Inference error, falling back to mock:', err?.message || err);
      const result = generateMockDetectionResult();
      setIsDetecting(false);
      navigation.navigate('Results', { result });
    }
  };

  const handleStartDetection = () => {
    // Kick off camera capture + server inference (or fallback)
    captureAndInfer();
  };

  const animatePress = (toValue: number) => {
    Animated.spring(pressAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 150,
    }).start();
  };

  // Fetch location-based risk on mount (shows general area risk)
  useEffect(() => {
    let mounted = true;

    const fetchLocationRisk = async () => {
      setIsRiskLoading(true);
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) {
            setRiskLevel('unknown');
            setIsRiskLoading(false);
          }
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = location.coords;

        // Check NOAA weather alerts for this location
        const response = await fetch(
          `https://api.weather.gov/alerts/active?point=${latitude},${longitude}`,
          { timeout: 5000 } as any
        );

        if (!response.ok) {
          // If NOAA fails, default to low risk (most common scenario)
          if (mounted) {
            setRiskLevel('low');
            console.log('[LOCATION] NOAA API unavailable, defaulting to low risk');
          }
        } else {
          const data = await response.json();
          const alerts = data.features || [];

          // Look for marine/beach/rip current related alerts
          let detectedRisk: 'low' | 'moderate' | 'high' = 'low';
          
          for (const alert of alerts) {
            const props = alert.properties || {};
            const event = (props.event || '').toLowerCase();
            const severity = (props.severity || '').toLowerCase();
            const description = (props.description || '').toLowerCase();
            
            // Check if it's beach/marine/rip current related
            const isWaterRelated = 
              event.includes('rip') || 
              event.includes('beach') || 
              event.includes('surf') ||
              event.includes('marine') ||
              event.includes('coastal') ||
              description.includes('rip current');

            if (isWaterRelated) {
              // Determine risk level from severity
              if (severity.includes('extreme') || severity.includes('severe')) {
                detectedRisk = 'high';
                break; // High risk found, no need to check more
              } else if (severity.includes('moderate') || event.includes('warning')) {
                detectedRisk = 'moderate';
              } else if (detectedRisk === 'low') {
                detectedRisk = 'moderate'; // Any alert = at least moderate
              }
            }
          }

          if (mounted) {
            setRiskLevel(detectedRisk);
            console.log(`[LOCATION] Risk level for (${latitude.toFixed(2)}, ${longitude.toFixed(2)}): ${detectedRisk}`);
          }
        }
      } catch (error) {
        console.log('[LOCATION] Error fetching risk:', error);
        // Default to low risk on error (most beaches are safe most of the time)
        if (mounted) {
          setRiskLevel('low');
        }
      } finally {
        if (mounted) {
          setIsRiskLoading(false);
        }
      }
    };

    fetchLocationRisk();

    return () => {
      mounted = false;
    };
  }, []);

  const renderPermissionView = () => (
    <PermissionContainer>
      <PermissionTitle>Camera Access Needed</PermissionTitle>
      <PermissionMessage>
        RipTide Guard uses your camera to scan the shoreline for hazardous
        currents. Please grant access to continue.
      </PermissionMessage>
      <PermissionButton onPress={requestPermission}>
        <PermissionButtonLabel>Allow Camera Access</PermissionButtonLabel>
      </PermissionButton>
    </PermissionContainer>
  );

  const showPermissionFallback = !permission?.granted;

  return (
    <Container>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <SafetyInfoModal visible={showInfoModal} onClose={() => setShowInfoModal(false)} />
      {showPermissionFallback || !isCameraActive ? (
        renderPermissionView()
      ) : (
        <CameraWrapper>
          <StyledCameraView
            ref={cameraRef}
            key={isCameraActive ? 'active' : 'inactive'}
            facing="back"
          />
          <Overlay
            colors={['rgba(2, 30, 47, 0.12)', 'rgba(2, 30, 47, 0.72)']}
          />
          <Header>
            <RiskContainer>
              {isRiskLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <RiskPill level={riskLevel} />
                  <RiskText>
                    {riskLevel === 'high'
                      ? 'High Risk Area'
                      : riskLevel === 'moderate'
                      ? 'Moderate Risk Area'
                      : riskLevel === 'low'
                      ? 'Low Risk Area'
                      : 'Getting Location...'}
                  </RiskText>
                </>
              )}
            </RiskContainer>
          </Header>

          <DetectionPrompt>
            <PromptHeading>Ready to scan</PromptHeading>
            <PromptBody>
              Aim the camera at the shoreline. Tap the button to analyze the
              scene for hazardous currents.
            </PromptBody>
          </DetectionPrompt>

          <ButtonContainer behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <AnimatedTouchable
              style={{ transform: [{ scale: pressAnim }] }}
              activeOpacity={0.9}
              onPressIn={() => animatePress(0.96)}
              onPressOut={() => animatePress(1)}
              onPress={handleStartDetection}
              disabled={isDetecting}
            >
              <DetectionDial>
                <DialInner active={isDetecting}>
                  {isDetecting ? (
                    <ActivityIndicator size="large" color="#fff" />
                  ) : (
                    <DialIcon />
                  )}
                </DialInner>
              </DetectionDial>
            </AnimatedTouchable>
            <SmallLabel>{isDetecting ? 'Analyzing…' : 'Start Detection'}</SmallLabel>
          </ButtonContainer>
          <InfoButton onPress={() => setShowInfoModal(true)}>
            <Ionicons name="information-circle" size={32} color="#fff" />
          </InfoButton>
        </CameraWrapper>
      )}
    </Container>
  );
};

type ThemeProps = { theme: AppTheme };

const themed =
  <T,>(fn: (theme: AppTheme) => T) =>
  ({ theme }: ThemeProps) =>
    fn(theme);

const Container = styled.View<ThemeProps>`
  flex: 1;
  background-color: ${themed((theme) => theme.colors.background)};
`;

const CameraWrapper = styled.View<ThemeProps>`
  flex: 1;
`;

const StyledCameraView = styled(CameraView)<ThemeProps>`
  flex: 1;
`;

const Overlay = styled(LinearGradient)<ThemeProps>`
  position: absolute;
  inset: 0;
`;

const Header = styled.View<ThemeProps>`
  position: absolute;
  top: ${themed((theme) => `${theme.spacing(6)}px`)};
  align-self: center;
  padding: ${themed((theme) => `${theme.spacing(2)}px`)};
  border-radius: ${themed((theme) => `${theme.radii.md}px`)};
  background-color: ${themed((theme) => theme.colors.cameraOverlay)};
  align-items: center;
  justify-content: center;
`;

const RiskContainer = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: auto;
`;

const RiskPill = styled.View<ThemeProps & { level?: string }>`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  margin-right: ${themed((theme) => `${theme.spacing(1)}px`)};
  background-color: ${({ level = 'unknown' }: { level?: string }) =>
    level === 'high' ? '#E34' : level === 'moderate' ? '#F2C500' : level === 'low' ? '#2FCB71' : '#808080'};
`;

const RiskText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 18px;
  font-weight: 700;
`;

const DetectionPrompt = styled.View<ThemeProps>`
  position: absolute;
  bottom: ${themed((theme) => `${theme.spacing(28)}px`)};
  left: ${themed((theme) => `${theme.spacing(4)}px`)};
  right: ${themed((theme) => `${theme.spacing(4)}px`)};
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
  border-radius: ${themed((theme) => `${theme.radii.md}px`)};
  background-color: ${themed((theme) => theme.colors.cameraOverlay)};
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
  shadow-color: #000;
  shadow-opacity: 0.04;
  shadow-radius: 10px;
  shadow-offset: 0px 6px;
  elevation: 2;
`;

const PromptHeading = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 20px;
  font-weight: 600;
`;

const PromptBody = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  margin-top: ${themed((theme) => `${theme.spacing(1)}px`)};
  font-size: 14px;
  line-height: 20px;
`;

const ButtonContainer = styled.KeyboardAvoidingView<ThemeProps>`
  position: absolute;
  bottom: ${themed((theme) => `${theme.spacing(6)}px`)};
  left: 0;
  right: 0;
  align-items: center;
`;

const AnimatedTouchable = Animated.createAnimatedComponent(styled.TouchableOpacity<ThemeProps>`
  align-items: center;
  justify-content: center;
`);

const DetectionDial = styled.View<ThemeProps>`
  width: 108px;
  height: 108px;
  border-radius: 54px;
  align-items: center;
  justify-content: center;
  background-color: rgba(255,255,255,0.04);
  border-width: 1px;
  border-color: rgba(255,255,255,0.06);
  shadow-color: #000;
  shadow-opacity: 0.12;
  shadow-radius: 18px;
  shadow-offset: 0px 10px;
  elevation: 6;
`;

const DialInner = styled.View<ThemeProps & { active?: boolean }>`
  width: 72px;
  height: 72px;
  border-radius: 36px;
  align-items: center;
  justify-content: center;
  border-width: 2px;
  border-color: rgba(255,255,255,0.08);
  background-color: ${({ theme, active }: { theme: AppTheme; active?: boolean }) =>
    active ? '#E34' : theme.colors.primary};
`;

const DialIcon = styled.View<ThemeProps>`
  width: 18px;
  height: 18px;
  border-radius: 3px;
  background-color: rgba(255,255,255,0.95);
`;

const SmallLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
  margin-top: ${themed((theme) => `${theme.spacing(2)}px`)};
  text-align: center;
`;

const ButtonLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-align: center;
`;

const PermissionContainer = styled.View<ThemeProps>`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${themed((theme) => `${theme.spacing(4)}px`)};
  background-color: ${themed((theme) => theme.colors.background)};
`;

const PermissionTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 24px;
  font-weight: 700;
  text-align: center;
`;

const PermissionMessage = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 16px;
  text-align: center;
  margin-top: ${themed((theme) => `${theme.spacing(2)}px`)};
  line-height: 24px;
`;

const PermissionButton = styled.TouchableOpacity<ThemeProps>`
  margin-top: ${themed((theme) => `${theme.spacing(4)}px`)};
  padding: ${themed(
    (theme) => `${theme.spacing(2)}px ${theme.spacing(4)}px`,
  )};
  background-color: ${themed((theme) => theme.colors.primary)};
  border-radius: ${themed((theme) => `${theme.radii.pill}px`)};
`;

const PermissionButtonLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 16px;
  font-weight: 600;
`;

const InfoButton = styled.TouchableOpacity<ThemeProps>`
  position: absolute;
  bottom: ${themed((theme) => `${theme.spacing(6)}px`)};
  right: ${themed((theme) => `${theme.spacing(4)}px`)};
  width: 32px;
  height: 32px;
  opacity: 0.7;
`;

const SafetyInfoModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <ModalOverlay>
      <ModalContent>
        <CloseButton onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </CloseButton>
        <SafetyImage
          source={require('../../assets/rip-currents-safety.png')}
          resizeMode="contain"
        />
          <TipsContainer>
            <TipRow>
              <TipBullet>•</TipBullet>
              <TipText>Relax — rip currents don't pull you under the water.</TipText>
            </TipRow>
            <TipRow>
              <TipBullet>•</TipBullet>
              <TipText>Don't swim against the current; swim parallel to shore to escape.</TipText>
            </TipRow>
            <TipRow>
              <TipBullet>•</TipBullet>
              <TipText>If you can't escape, float or tread water and signal for help.</TipText>
            </TipRow>
            <TipRow>
              <TipBullet>•</TipBullet>
              <TipText>If possible, move toward areas with lifeguards and call for assistance.</TipText>
            </TipRow>
          </TipsContainer>
      </ModalContent>
    </ModalOverlay>
  </Modal>
);

const ModalOverlay = styled.View<ThemeProps>`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.85);
  align-items: center;
  justify-content: center;
  padding: ${themed((theme) => `${theme.spacing(4)}px`)};
`;

const ModalContent = styled.View<ThemeProps>`
  width: 100%;
  max-height: 92%;
  background-color: transparent;
  border-radius: ${themed((theme) => `${theme.radii.lg}px`)};
  overflow: visible;
  align-items: center;
  padding-bottom: ${themed((theme) => `${theme.spacing(3)}px`)};
`;

const CloseButton = styled.TouchableOpacity<ThemeProps>`
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  padding: ${themed((theme) => `${theme.spacing(2)}px`)};
`;

const SafetyImage = styled.Image`
  width: 160%;
  height: undefined;
  aspect-ratio: 1.5;
  align-self: center;
`;

const TipsContainer = styled.View<ThemeProps>`
  width: 94%;
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  padding: ${themed((theme) => `${theme.spacing(2)}px`)};
  border-radius: ${themed((theme) => `${theme.radii.md}px`)};
  margin-top: ${themed((theme) => `${theme.spacing(0)}px`)};
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const TipRow = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: ${themed((theme) => `${theme.spacing(1)}px`)};
`;

const TipBullet = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  margin-right: ${themed((theme) => `${theme.spacing(2)}px`)};
  font-size: 18px;
`;

const TipText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  flex: 1;
  font-size: 15px;
`;

