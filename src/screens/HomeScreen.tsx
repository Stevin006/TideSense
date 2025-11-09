import React from 'react';
import { StatusBar } from 'expo-status-bar';
import styled from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

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

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  return (
    <Container>
      <StatusBar style="light" />
      <Title>Welcome to RipTide</Title>
      <Description>Your personal wave detection assistant</Description>
      <StartButton 
        onPress={() => navigation.navigate('Camera')}
        activeOpacity={0.8}
      >
        <ButtonText>Start App</ButtonText>
      </StartButton>
    </Container>
  );
};