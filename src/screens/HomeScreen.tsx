import React from 'react';
import { StatusBar } from 'expo-status-bar';
import styled from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = ({ navigation }: HomeScreenProps) => {
  return (
    <Container>
      <StatusBar style="light" />
      <StartButton 
        onPress={() => navigation.navigate('Camera')}
        activeOpacity={0.8}
      >
        <ButtonText>Start App</ButtonText>
      </StartButton>
    </Container>
  );
};

const Container = styled.View<{ theme: AppTheme }>`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.background};
`;

const StartButton = styled.TouchableOpacity<{ theme: AppTheme }>`
  padding: ${({ theme }) => `${theme.spacing(3)}px ${theme.spacing(6)}px`};
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radii.pill}px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.25;
  shadow-radius: 8px;
  elevation: 5;
`;

const ButtonText = styled.Text<{ theme: AppTheme }>`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.3px;
`;