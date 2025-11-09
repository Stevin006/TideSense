import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import styled from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View, Animated, Image, ScrollView } from 'react-native';

const videoSource = require('../../assets/Wave.mp4');
const pinkShellSource = require('../../assets/pinkShell.png');
const blueShellSource = require('../../assets/blueShell.png');
const sandddd = require('../../assets/SAND.png');

// --- Styled Components ---

const ScreenContainer = styled.View`
  flex: 1;
  background-color: ${'rgba(255, 231, 195, 1)'};
`;

const AnimatedContentWrapper = styled(Animated.ScrollView)`
  flex: 1;
`;

const ContentInner = styled.View`
  align-items: center;
  justify-content: center;
  padding: 20px;
  padding-bottom: 80px;
`;

const Title = styled.Text`
  color: #0077be;
  font-size: 42px;
  font-weight: 800;
  margin-bottom: 10px;
  text-align: center;
  letter-spacing: 1px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.15);
`;

const Description = styled.Text`
  color: #004d73;
  font-size: 18px;
  margin-bottom: 40px;
  text-align: center;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.3);
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

// --- Stylesheet ---
const styles = StyleSheet.create({
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: -20,
    right: -20,
    bottom: -100,
  },
  greenShell: {
    transform: [{ rotate: '-30deg' }], // adjust the rotation as needed
    top: 215, // adjust the top position as needed
    left: -185, // adjust the left position as needed
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  video: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: -50,
    left: -20,
    right: -20,
    bottom: -50,
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
  shellsContainer: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    zIndex: 10,
  },
  shell: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  pinkShell: {
    transform: [{ rotate: '-15deg' }],
    top: 75,
    left: -115,
  },
  blueShell: {
    transform: [{ rotate: '15deg' }],
    top: 150,
    left: 55,
  },
  centerShellContainer: {
    position: 'absolute',
    top: -650,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  centerShell: {
    width: 700,
    height: 700,
    resizeMode: 'contain',
    opacity: 0.7,
  },
});

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

// --- Component ---
export const HomeScreen = ({ navigation }: HomeScreenProps) => {
    const videoTranslateY = useRef(new Animated.Value(300)).current;
    const contentTranslateY = useRef(new Animated.Value(0)).current;
    const shellsTranslateY = useRef(new Animated.Value(0)).current;
    const centerShellTranslateY = useRef(new Animated.Value(0)).current;
    const greenShellTranslateY = useRef(new Animated.Value(0)).current;

    const player = useVideoPlayer(videoSource, player => {
      player.loop = true;
      player.muted = true;
      player.play();
    });

    const handleStartPress = () => {
  // Animate the video upward
  Animated.timing(videoTranslateY, {
    toValue: -100,
    duration: 1000,
    useNativeDriver: true
  }).start();

  // Animate the content (text/buttons) upward
  Animated.timing(contentTranslateY, {
    toValue: -1000,
    duration: 1500,
    useNativeDriver: true
  }).start();

  // Animate the shells upward
  Animated.parallel([
    Animated.timing(shellsTranslateY, {
      toValue: -1000,
      duration: 1200,
      useNativeDriver: true
    }),
    Animated.timing(centerShellTranslateY, {
      toValue: -1000,
      duration: 700,
      useNativeDriver: true
    }),
    Animated.timing(greenShellTranslateY, {
      toValue: -1000,
      duration: 700,
      useNativeDriver: true
    }),
  ]).start(() => {
    setTimeout(() => {
      navigation.navigate('Camera');
    }, 700);
  });
};

    useEffect(() => {
      if (player) {
        try {
          player.play();
        } catch (error) {
          console.warn('Video autoplay failed:', error);
        }
      }
    }, [player]);
    
    return (
    <ScreenContainer>
      {/* Animated Video Container */}
      <Animated.View style={[
        styles.videoContainer,
        {
          transform: [
            { scale: 1.2 },
            { translateY: videoTranslateY }
          ]
        }
      ]} pointerEvents="none">
        <VideoView 
          style={styles.video} 
          player={player}
          nativeControls={false}
          contentFit="cover"
        />
      </Animated.View>

      <View style={styles.overlay} />

      {/* Animated Center Shell Container */}
      <Animated.View 
        style={[
          styles.centerShellContainer,
          {
            transform: [
              { translateY: centerShellTranslateY }
            ]
          }
        ]}
      >
        <Image 
          source={sandddd} 
          style={styles.centerShell} 
        />
      </Animated.View>

      {/* Animated Shells Container */}
      <Animated.View 
        style={[
          styles.shellsContainer,
          {
            transform: [
              { translateY: shellsTranslateY }
            ]
          }
        ]}
      >
        <Image 
          source={pinkShellSource} 
          style={[styles.shell, styles.pinkShell]} 
        />
        <Image 
          source={blueShellSource} 
          style={[styles.shell, styles.blueShell]} 
        />

        <Image source={require('../../assets/starfish.png')} style={[styles.shell, styles.greenShell]} />

      </Animated.View>

      {/* Animated Content Container */}
      <AnimatedContentWrapper 
        style={{ 
          transform: [
            { translateY: contentTranslateY }
          ],
          top: 80,
          zIndex: 10
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ContentInner>
          <StatusBar style="light" />
          <Title>Welcome to TideSense</Title>
          <Description>Your personal riptide detection assistant</Description>
          <StartButton 
            onPress={handleStartPress}
            activeOpacity={0.8}
            style = {{zIndex :20}}
          >
            <ButtonText >Start Scanning</ButtonText>
          </StartButton>
          <StartButton 
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.8}
            style = {{zIndex :20, marginTop: 16, backgroundColor: '#6b7280'}}
          >
            <ButtonText >View History</ButtonText>
          </StartButton>
          <StartButton 
            onPress={() => navigation.navigate('Weather')}
            activeOpacity={0.8}
            style = {{zIndex :20, marginTop: 16, backgroundColor: '#3b82f6'}}
          >
            <ButtonText >Weather & Conditions</ButtonText>
          </StartButton>
          <StartButton 
            onPress={() => navigation.navigate('SafetyMap')}
            activeOpacity={0.8}
            style = {{zIndex :20, marginTop: 16, backgroundColor: '#10b981'}}
          >
            <ButtonText >Safety Map</ButtonText>
          </StartButton>
          <StartButton 
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.8}
            style = {{zIndex :20, marginTop: 16, backgroundColor: '#8b5cf6'}}
          >
            <ButtonText >Analytics Dashboard</ButtonText>
          </StartButton>
        </ContentInner>
      </AnimatedContentWrapper>
    </ScreenContainer>
  );
};