import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import styled from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

const videoSource = require('../../assets/TrueBackground.mp4');

const Container = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: { theme: AppTheme }) => theme.colors.background};
  padding: 20px;
`;

const Title = styled.Text`
  color: ${({ theme }: { theme: AppTheme }) => theme.colors.textPrimary};
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
`;

const Description = styled.Text`
  color: ${({ theme }: { theme: AppTheme }) => theme.colors.textPrimary};
  font-size: 18px;
  margin-bottom: 40px;
  text-align: center;
  opacity: 0.8;
`;

const StartButton = styled.TouchableOpacity`
  padding: ${({ theme }: { theme: AppTheme }) => `${theme.spacing(3)}px ${theme.spacing(6)}px`};
  background-color: ${({ theme }: { theme: AppTheme }) => theme.colors.primary};
  border-radius: ${({ theme }: { theme: AppTheme }) => theme.radii.pill}px;
  align-items: center;
  justify-content: center;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.25;
  shadow-radius: 8px;
  elevation: 5;
`;

const ButtonText = styled.Text`
  color: ${({ theme }: { theme: AppTheme }) => theme.colors.textPrimary};
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.3px;
`;

const styles = StyleSheet.create({
  videoContainer: {
    position: 'absolute',
    top: -50, // Extend beyond safe area
    left: -20,
    right: -20,
    bottom: -50,
  },
  video: {
    flex: 1,
    transform: [{ scale: 1.1 }], // Slightly scale up the video
  },
  overlay: {
    position: 'absolute',
    top: -50,
    left: -20,
    right: -20,
    bottom: -50,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  useEffect(() => {
    // Ensure video plays on mount
    if (player) {
      try {
        player.play();
      } catch (error) {
        console.warn('Video autoplay failed:', error);
      }
    }
  }, [player]);
    
  return (
    <Container>
      <View style={styles.videoContainer} pointerEvents="none">
        <VideoView 
          style={styles.video} 
          player={player}
          nativeControls={false}
          contentFit="cover"
        />
      </View>
      <View style={styles.overlay} />
      <View style={styles.content}>
        <StatusBar style="light" />
        <Title>Welcome to RipTide</Title>
        <Description>Your personal wave detection assistant</Description>
        <StartButton 
          onPress={() => navigation.navigate('Camera')}
          activeOpacity={0.8}
        >
          <ButtonText>Start App</ButtonText>
        </StartButton>
      </View>
    </Container>
  );
};