import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { Transaction } from '../database/db';

interface AnalyticsChartProps {
  transactions: Transaction[];
}

export default function AnalyticsChart({ transactions }: AnalyticsChartProps) {
  const screenWidth = Dimensions.get('window').width - 48; // Margin padding
  const chartHeight = 150;
  const paddingBottom = 24;
  const paddingTop = 10;
  const paddingLeft = 10;
  const paddingRight = 10;

  const drawableWidth = screenWidth - paddingLeft - paddingRight;
  const drawableHeight = chartHeight - paddingTop - paddingBottom;

  // 1. Get the last 7 days (dates)
  const getPast7Days = () => {
    const days = [];
    const dateNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        dateString: d.toISOString().split('T')[0], // YYYY-MM-DD
        dayName: dateNames[d.getDay()],
        income: 0,
        expense: 0
      });
    }
    return days;
  };

  const weeklyData = getPast7Days();

  // 2. Sum transactions by date
  transactions.forEach((tx) => {
    const txDateStr = tx.date.split('T')[0];
    const targetDay = weeklyData.find((day) => day.dateString === txDateStr);
    if (targetDay) {
      if (tx.type === 'income') {
        targetDay.income += tx.amount;
      } else if (tx.type === 'expense') {
        targetDay.expense += tx.amount;
      }
    }
  });

  // 3. Find max value to scale heights
  const maxVal = Math.max(
    ...weeklyData.map((d) => Math.max(d.income, d.expense)),
    100 // fallback base scale
  );

  const barWidth = Math.max(8, (drawableWidth / 7) * 0.3);
  const gap = 4;
  const colWidth = drawableWidth / 7;

  return (
    <View style={styles.container}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Weekly Summary</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Expense</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartWrapper}>
        <Svg width={screenWidth} height={chartHeight}>
          {/* Base Axis Line */}
          <Line
            x1={paddingLeft}
            y1={chartHeight - paddingBottom}
            x2={screenWidth - paddingRight}
            y2={chartHeight - paddingBottom}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={1}
          />

          {/* Render Bars & Labels */}
          {weeklyData.map((day, index) => {
            const xCenter = paddingLeft + (index * colWidth) + (colWidth / 2);
            
            // Scaled heights
            const incomeHeight = (day.income / maxVal) * drawableHeight;
            const expenseHeight = (day.expense / maxVal) * drawableHeight;

            // Coordinates (y starts from top in SVG)
            const incomeY = chartHeight - paddingBottom - incomeHeight;
            const expenseY = chartHeight - paddingBottom - expenseHeight;

            // X offsets for side-by-side grouped bars
            const incomeX = xCenter - barWidth - (gap / 2);
            const expenseX = xCenter + (gap / 2);

            return (
              <React.Fragment key={day.dateString}>
                {/* Income Bar */}
                {day.income > 0 && (
                  <Rect
                    x={incomeX}
                    y={incomeY}
                    width={barWidth}
                    height={incomeHeight}
                    fill="#10B981"
                    rx={4}
                  />
                )}

                {/* Expense Bar */}
                {day.expense > 0 && (
                  <Rect
                    x={expenseX}
                    y={expenseY}
                    width={barWidth}
                    height={expenseHeight}
                    fill="#EF4444"
                    rx={4}
                  />
                )}

                {/* Day label */}
                <SvgText
                  x={xCenter}
                  y={chartHeight - 6}
                  fill="#8F9BB3"
                  fontSize={10}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {day.dayName}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#181B30',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#8F9BB3',
    fontSize: 11,
    fontWeight: '600',
  },
  chartWrapper: {
    alignItems: 'center',
  },
});
