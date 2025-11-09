import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DetectionStatus } from '../types/detection';

interface EmergencyActionsProps {
  riskLevel: DetectionStatus;
  latitude?: number;
  longitude?: number;
}

export const EmergencyActionsPanel = ({ riskLevel, latitude, longitude }: EmergencyActionsProps) => {
  const handleCall911 = () => {
    Alert.alert(
      'Call Emergency Services',
      'This will dial 911. Are you in immediate danger?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:911'),
        },
      ]
    );
  };

  const handleFindLifeguard = () => {
    if (latitude && longitude) {
      const url = Platform.select({
        ios: `maps:0,0?q=Lifeguard+Station&sll=${latitude},${longitude}`,
        android: `geo:0,0?q=Lifeguard+Station&near=${latitude},${longitude}`,
        default: `https://www.google.com/maps/search/Lifeguard+Station/@${latitude},${longitude},15z`,
      });
      Linking.openURL(url);
    } else {
      Linking.openURL('https://www.google.com/maps/search/Lifeguard+Station');
    }
  };

  const handleCheckNOAA = () => {
    if (latitude && longitude) {
      Linking.openURL(`https://www.weather.gov/`);
    } else {
      Linking.openURL('https://www.weather.gov/');
    }
  };

  const handleShareLocation = () => {
    if (latitude && longitude) {
      const message = `🚨 I need help at the beach!\n\nRiptide Risk: ${riskLevel}\nLocation: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nMaps: https://maps.google.com/?q=${latitude},${longitude}`;
      
      if (Platform.OS === 'ios') {
        Linking.openURL(`sms:&body=${encodeURIComponent(message)}`);
      } else {
        Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
      }
    } else {
      Alert.alert('Location Unavailable', 'Unable to determine your current location');
    }
  };

  const handleBeachSafety = () => {
    Linking.openURL('https://www.weather.gov/safety/ripcurrent');
  };

  // Only show call 911 for HIGH risk
  const showEmergencyCall = riskLevel === 'HIGH' || riskLevel === 'DANGER';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Quick Actions</Text>
      
      <View style={styles.grid}>
        {showEmergencyCall && (
          <TouchableOpacity style={[styles.actionButton, styles.emergencyButton]} onPress={handleCall911}>
            <Ionicons name="call" size={32} color="#ffffff" />
            <Text style={styles.emergencyButtonText}>Call 911</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={[styles.actionButton, styles.lifeguardButton]} onPress={handleFindLifeguard}>
          <Ionicons name="person" size={28} color="#ffffff" />
          <Text style={styles.actionButtonText}>Find Lifeguard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.weatherButton]} onPress={handleCheckNOAA}>
          <Ionicons name="partly-sunny" size={28} color="#ffffff" />
          <Text style={styles.actionButtonText}>NOAA Forecast</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShareLocation}>
          <Ionicons name="share-social" size={28} color="#ffffff" />
          <Text style={styles.actionButtonText}>Share Location</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.safetyButton]} onPress={handleBeachSafety}>
          <Ionicons name="information-circle" size={28} color="#ffffff" />
          <Text style={styles.actionButtonText}>Safety Tips</Text>
        </TouchableOpacity>
      </View>
      
      {/* Safety Instructions */}
      {showEmergencyCall && (
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#dc2626" />
          <Text style={styles.warningText}>
            DO NOT enter the water. Move away from the shoreline immediately.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    aspectRatio: 1.5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  emergencyButton: {
    backgroundColor: '#991b1b',
    minWidth: '100%',
    aspectRatio: 2.5,
    gap: 8,
    paddingVertical: 16,
  },
  lifeguardButton: {
    backgroundColor: '#1e40af',
  },
  weatherButton: {
    backgroundColor: '#0e7490',
  },
  shareButton: {
    backgroundColor: '#6d28d9',
  },
  safetyButton: {
    backgroundColor: '#047857',
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '600',
  },
});
