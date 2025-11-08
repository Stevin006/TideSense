import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
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
  const detectionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleStartDetection = () => {
    if (isDetecting) return;

    setIsDetecting(true);

    detectionTimeout.current = setTimeout(() => {
      const result = generateMockDetectionResult();
      setIsDetecting(false);
      navigation.navigate('Results', { result });
    }, 2200 + Math.random() * 600);
  };

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
      {showPermissionFallback || !isCameraActive ? (
        renderPermissionView()
      ) : (
        <CameraWrapper>
          <StyledCameraView
            key={isCameraActive ? 'active' : 'inactive'}
            facing="back"
          />
          <Overlay
            colors={['rgba(2, 30, 47, 0.15)', 'rgba(2, 30, 47, 0.75)']}
          />
          <Header>
            <BrandTitle>RipTide Guard</BrandTitle>
            <BrandSubtitle>AI-powered shoreline safety</BrandSubtitle>
          </Header>

          <DetectionPrompt>
            <PromptHeading>Point the camera toward the water</PromptHeading>
            <PromptBody>
              Position yourself facing the shoreline. We’ll analyze live footage
              for dangerous current patterns.
            </PromptBody>
          </DetectionPrompt>

          <ButtonContainer behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <DetectionButton
              activeOpacity={0.85}
              onPress={handleStartDetection}
              disabled={isDetecting}
            >
              {isDetecting ? (
                <>
                  <ActivityIndicator size="large" color="#fff" />
                  <ButtonLabel>Analyzing…</ButtonLabel>
                </>
              ) : (
                <>
                  <ButtonLabel>Start Detection</ButtonLabel>
                </>
              )}
            </DetectionButton>
          </ButtonContainer>
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
  left: ${themed((theme) => `${theme.spacing(3)}px`)};
  right: ${themed((theme) => `${theme.spacing(3)}px`)};
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
  border-radius: ${themed((theme) => `${theme.radii.md}px`)};
  background-color: ${themed((theme) => theme.colors.cameraOverlay)};
`;

const BrandTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const BrandSubtitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  margin-top: ${themed((theme) => `${theme.spacing(1)}px`)};
  font-size: 14px;
`;

const DetectionPrompt = styled.View<ThemeProps>`
  position: absolute;
  bottom: ${themed((theme) => `${theme.spacing(23)}px`)};
  left: ${themed((theme) => `${theme.spacing(3)}px`)};
  right: ${themed((theme) => `${theme.spacing(3)}px`)};
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
  border-radius: ${themed((theme) => `${theme.radii.md}px`)};
  background-color: ${themed((theme) => theme.colors.cameraOverlay)};
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

const DetectionButton = styled.TouchableOpacity<
  ThemeProps & { disabled?: boolean }
>`
  width: 120px;
  height: 120px;
  border-radius: ${themed((theme) => `${theme.radii.pill}px`)};
  background-color: ${themed((theme) => theme.colors.primary)};
  align-items: center;
  justify-content: center;
  gap: ${themed((theme) => `${theme.spacing(1)}px`)};
  shadow-color: #000;
  shadow-offset: 0px 12px;
  shadow-opacity: 0.25;
  shadow-radius: 24px;
  elevation: 10;
  opacity: ${({ disabled }: { disabled?: boolean }) =>
    disabled ? 0.75 : 1};
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

