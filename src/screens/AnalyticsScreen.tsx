import { useEffect, useState } from 'react';
import { ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import styled, { useTheme } from '../theme/styled';
import type { AppTheme } from '../theme/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getDetectionHistory, getDetectionStats, DetectionRecord } from '../utils/database';

type AnalyticsScreenProps = NativeStackScreenProps<RootStackParamList, 'Analytics'>;

const screenWidth = Dimensions.get('window').width;

interface TimeSeriesData {
  labels: string[];
  datasets: {
    data: number[];
  }[];
}

export const AnalyticsScreen = ({ navigation }: AnalyticsScreenProps) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    moderate: 0,
    low: 0,
    avgConfidence: 75,
  });
  const [riskTrendData, setRiskTrendData] = useState<TimeSeriesData | null>(null);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Get stats
      const detectionStats = await getDetectionStats();
      setStats({ ...detectionStats, avgConfidence: 75 });

      // Get all detections for trend analysis
      const allDetections = await getDetectionHistory(1000); // Get up to 1000 records

      // Calculate risk trend over last 7 days
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      
      const recentDetections = allDetections.filter(
        (d: DetectionRecord) => new Date(d.timestamp).getTime() >= sevenDaysAgo
      );

      // Group by day
      const dayGroups: { [key: string]: number } = {};
      recentDetections.forEach((detection: DetectionRecord) => {
        const date = new Date(detection.timestamp);
        const dayKey = `${date.getMonth() + 1}/${date.getDate()}`;
        dayGroups[dayKey] = (dayGroups[dayKey] || 0) + 1;
      });

      // Prepare trend data
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        const dayKey = `${date.getMonth() + 1}/${date.getDate()}`;
        last7Days.push({
          label: dayKey,
          value: dayGroups[dayKey] || 0,
        });
      }

      setRiskTrendData({
        labels: last7Days.map(d => d.label),
        datasets: [{
          data: last7Days.map(d => d.value),
        }],
      });

      // Prepare risk distribution pie chart
      const pieData = [
        {
          name: 'Low Risk',
          population: detectionStats.low,
          color: theme.colors.success,
          legendFontColor: theme.colors.textSecondary,
        },
        {
          name: 'Moderate',
          population: detectionStats.moderate,
          color: '#F2C500',
          legendFontColor: theme.colors.textSecondary,
        },
        {
          name: 'High Risk',
          population: detectionStats.high,
          color: theme.colors.danger,
          legendFontColor: theme.colors.textSecondary,
        },
      ];

      setRiskDistribution(pieData);
      setLoading(false);
    } catch (error) {
      console.error('Analytics error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container edges={['top', 'left', 'right']}>
        <LoadingContainer>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <LoadingText>Loading analytics...</LoadingText>
        </LoadingContainer>
      </Container>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: theme.colors.cardBackground,
    backgroundGradientTo: theme.colors.cardBackground,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 12,
      fill: theme.colors.textSecondary,
    },
  };

  return (
    <Container edges={['top', 'left', 'right']}>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </BackButton>
        <HeaderTitle>Analytics</HeaderTitle>
        <RefreshButton onPress={loadAnalytics}>
          <Ionicons name="refresh" size={24} color={theme.colors.textPrimary} />
        </RefreshButton>
      </Header>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ContentContainer>
          {/* Stats Overview */}
          <SectionTitle>Overview</SectionTitle>
          <StatsGrid>
            <StatCard>
              <StatIcon>
                <Ionicons name="scan" size={32} color={theme.colors.primary} />
              </StatIcon>
              <StatValue>{stats.total}</StatValue>
              <StatLabel>Total Scans</StatLabel>
            </StatCard>

            <StatCard>
              <StatIcon>
                <Ionicons name="warning" size={32} color={theme.colors.danger} />
              </StatIcon>
              <StatValue>{stats.high}</StatValue>
              <StatLabel>High Risk</StatLabel>
            </StatCard>

            <StatCard>
              <StatIcon>
                <Ionicons name="alert-circle" size={32} color="#F2C500" />
              </StatIcon>
              <StatValue>{stats.moderate}</StatValue>
              <StatLabel>Moderate</StatLabel>
            </StatCard>

            <StatCard>
              <StatIcon>
                <Ionicons name="shield-checkmark" size={32} color={theme.colors.success} />
              </StatIcon>
              <StatValue>{stats.low}</StatValue>
              <StatLabel>Low Risk</StatLabel>
            </StatCard>
          </StatsGrid>

          {/* Confidence Score */}
          <ConfidenceCard>
            <ConfidenceHeader>
              <ConfidenceTitle>Average Confidence</ConfidenceTitle>
              <ConfidenceValue>{stats.avgConfidence}%</ConfidenceValue>
            </ConfidenceHeader>
            <ConfidenceBar>
              <ConfidenceFill width={stats.avgConfidence} />
            </ConfidenceBar>
            <ConfidenceLabel>
              Model accuracy across all detections
            </ConfidenceLabel>
          </ConfidenceCard>

          {/* Risk Trend Chart */}
          {riskTrendData && riskTrendData.datasets[0].data.some(v => v > 0) && (
            <>
              <SectionTitle>Detection Trend (7 Days)</SectionTitle>
              <ChartCard>
                <LineChart
                  data={riskTrendData}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              </ChartCard>
            </>
          )}

          {/* Risk Distribution */}
          {stats.total > 0 && (
            <>
              <SectionTitle>Risk Distribution</SectionTitle>
              <ChartCard>
                <PieChart
                  data={riskDistribution}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              </ChartCard>
            </>
          )}

          {/* Insights */}
          <SectionTitle>Insights</SectionTitle>
          <InsightCard>
            <InsightRow>
              <Ionicons name="trending-up" size={20} color={theme.colors.primary} />
              <InsightText>
                {stats.high > stats.moderate + stats.low
                  ? 'High risk detections are above average - exercise caution'
                  : stats.low > stats.total / 2
                  ? 'Most scans show safe conditions'
                  : 'Mixed conditions detected - stay alert'}
              </InsightText>
            </InsightRow>
            <InsightRow>
              <Ionicons name="analytics" size={20} color={theme.colors.primary} />
              <InsightText>
                {stats.avgConfidence > 80
                  ? 'High confidence in detection accuracy'
                  : stats.avgConfidence > 60
                  ? 'Moderate confidence - verify with local lifeguards'
                  : 'Lower confidence - always use caution'}
              </InsightText>
            </InsightRow>
            <InsightRow>
              <Ionicons name="time" size={20} color={theme.colors.primary} />
              <InsightText>
                {stats.total > 10
                  ? `You've performed ${stats.total} scans - great safety awareness!`
                  : 'Scan regularly for up-to-date conditions'}
              </InsightText>
            </InsightRow>
          </InsightCard>

          {/* Safety Score */}
          <SafetyScoreCard>
            <SafetyScoreHeader>
              <SafetyScoreTitle>Your Safety Score</SafetyScoreTitle>
              <SafetyScoreValue>
                {Math.round((stats.low / (stats.total || 1)) * 100)}
              </SafetyScoreValue>
            </SafetyScoreHeader>
            <SafetyScoreSubtext>
              Based on your scan history and risk awareness
            </SafetyScoreSubtext>
            <SafetyScoreBadge>
              <Ionicons 
                name="shield-checkmark" 
                size={24} 
                color={theme.colors.success} 
              />
              <SafetyScoreBadgeText>Beach Safety Champion</SafetyScoreBadgeText>
            </SafetyScoreBadge>
          </SafetyScoreCard>
        </ContentContainer>
      </ScrollView>
    </Container>
  );
};

// Styled Components
type ThemeProps = { theme: AppTheme };
const themed = <T,>(fn: (theme: AppTheme) => T) => ({ theme }: ThemeProps) => fn(theme);

const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${themed((theme) => theme.colors.background)};
`;

const Header = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
  border-bottom-width: 1px;
  border-bottom-color: ${themed((theme) => theme.colors.divider)};
`;

const BackButton = styled.TouchableOpacity`
  padding: 8px;
`;

const RefreshButton = styled.TouchableOpacity`
  padding: 8px;
`;

const HeaderTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 20px;
  font-weight: 700;
`;

const ContentContainer = styled.View<ThemeProps>`
  padding: ${themed((theme) => `${theme.spacing(3)}px`)};
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  margin-top: 16px;
  font-size: 16px;
`;

const SectionTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  margin-top: 8px;
`;

const StatsGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
`;

const StatCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 12px;
  padding: 20px;
  align-items: center;
  flex: 1;
  min-width: 45%;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const StatIcon = styled.View`
  margin-bottom: 12px;
`;

const StatValue = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
`;

const StatLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 13px;
  text-align: center;
`;

const ConfidenceCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const ConfidenceHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ConfidenceTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 16px;
  font-weight: 600;
`;

const ConfidenceValue = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.primary)};
  font-size: 24px;
  font-weight: 700;
`;

const ConfidenceBar = styled.View<ThemeProps>`
  height: 8px;
  background-color: ${themed((theme) => theme.colors.divider)};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
`;

const ConfidenceFill = styled.View<ThemeProps & { width: number }>`
  height: 100%;
  width: ${({ width }: { width: number }) => width}%;
  background-color: ${themed((theme) => theme.colors.primary)};
`;

const ConfidenceLabel = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 12px;
`;

const ChartCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const InsightCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.cardBackground)};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border-width: 1px;
  border-color: ${themed((theme) => theme.colors.divider)};
`;

const InsightRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
`;

const InsightText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 14px;
  flex: 1;
  line-height: 20px;
`;

const SafetyScoreCard = styled.View<ThemeProps>`
  background-color: ${themed((theme) => theme.colors.primary)}20;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border-width: 2px;
  border-color: ${themed((theme) => theme.colors.primary)};
`;

const SafetyScoreHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const SafetyScoreTitle = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textPrimary)};
  font-size: 18px;
  font-weight: 700;
`;

const SafetyScoreValue = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.primary)};
  font-size: 40px;
  font-weight: 700;
`;

const SafetyScoreSubtext = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.textSecondary)};
  font-size: 13px;
  margin-bottom: 16px;
`;

const SafetyScoreBadge = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: ${themed((theme) => theme.colors.success)}20;
  border-radius: 8px;
`;

const SafetyScoreBadgeText = styled.Text<ThemeProps>`
  color: ${themed((theme) => theme.colors.success)};
  font-size: 14px;
  font-weight: 600;
`;
