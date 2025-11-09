import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  getDetectionHistory,
  getDetectionStats,
  deleteDetection,
  clearAllDetections,
  DetectionRecord,
} from '../utils/database';

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

export default function HistoryScreen() {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const [history, setHistory] = useState<DetectionRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, high: 0, moderate: 0, low: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const loadHistory = async () => {
    try {
      const records = await getDetectionHistory(100);
      const statsData = await getDetectionStats();
      
      if (filter) {
        setHistory(records.filter(r => r.riskLevel === filter));
      } else {
        setHistory(records);
      }
      
      setStats(statsData);
    } catch (error) {
      console.error('[HistoryScreen] Error loading history:', error);
      Alert.alert('Error', 'Failed to load detection history');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Detection',
      'Are you sure you want to delete this detection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDetection(id);
            loadHistory();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all detection records?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllDetections();
            loadHistory();
          },
        },
      ]
    );
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH':
        return '#ef4444';
      case 'MODERATE':
        return '#f59e0b';
      case 'LOW':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderItem = ({ item }: { item: DetectionRecord }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Results', { detectionId: item.id })}
      onLongPress={() => item.id && handleDelete(item.id)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.riskLevel) }]}>
          <Text style={styles.riskText}>{item.riskLevel}</Text>
        </View>
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Confidence:</Text>
          <Text style={styles.value}>{item.confidence}%</Text>
        </View>
        
        {item.noaaRisk && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Area Risk:</Text>
            <Text style={styles.value}>{item.noaaRisk}</Text>
          </View>
        )}
        
        {item.latitude && item.longitude && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>
              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>
      
      {item.imageBase64 && (
        <Image
          source={{ uri: item.imageBase64 }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detection History</Text>
        <View style={styles.backButton} />
      </View>

      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Scans</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.high}</Text>
            <Text style={styles.statLabel}>High</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.moderate}</Text>
            <Text style={styles.statLabel}>Moderate</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#d1fae5' }]}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.low}</Text>
            <Text style={styles.statLabel}>Low</Text>
          </View>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !filter && styles.filterButtonActive]}
          onPress={() => setFilter(null)}
        >
          <Text style={[styles.filterText, !filter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'HIGH' && styles.filterButtonActive]}
          onPress={() => setFilter('HIGH')}
        >
          <Text style={[styles.filterText, filter === 'HIGH' && styles.filterTextActive]}>High</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'MODERATE' && styles.filterButtonActive]}
          onPress={() => setFilter('MODERATE')}
        >
          <Text style={[styles.filterText, filter === 'MODERATE' && styles.filterTextActive]}>Moderate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'LOW' && styles.filterButtonActive]}
          onPress={() => setFilter('LOW')}
        >
          <Text style={[styles.filterText, filter === 'LOW' && styles.filterTextActive]}>Low</Text>
        </TouchableOpacity>
      </View>

      {/* History List */}
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No detection history yet</Text>
            <Text style={styles.emptySubtext}>Scan some riptides to see them here!</Text>
          </View>
        }
      />

      {/* Clear All Button */}
      {history.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
          <Text style={styles.clearButtonText}>Clear All History</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  riskText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  clearButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
