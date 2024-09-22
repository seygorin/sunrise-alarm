import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SunriseListItem = ({
  sunrise,
  onSetAlarm,
  theme,
  minutesOffset,
  isToday,
}) => {
  const formatDate = date => {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const dayOfWeek = days[date.getDay()];
    const fullDate = `${
      months[date.getMonth()]
    } ${date.getDate()}, ${date.getFullYear()}`;
    const time = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return { dayOfWeek, fullDate, time };
  };

  const { dayOfWeek, fullDate, time } = formatDate(sunrise);

  return (
    <View style={styles.sunriseItem}>
      <View style={styles.sunriseInfo}>
        <View style={styles.dayTimeContainer}>
          <Text
            style={[
              styles.dayText,
              { color: theme.foreground },
              isToday && { color: theme.accent },
            ]}>
            {dayOfWeek}
          </Text>
          <Text style={[styles.timeText, { color: theme.foreground }]}>
            {time}
            {minutesOffset !== 0 &&
              ` (${minutesOffset > 0 ? '+' : ''}${minutesOffset} min)`}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: theme.foreground }]}>
          {fullDate}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => onSetAlarm(sunrise, sunrise.getDay() + 1)}
        accessibilityLabel={`Set alarm for ${dayOfWeek}`}
      >
        <Text style={styles.emoji}>🔔</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sunriseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sunriseInfo: {
    flex: 1,
  },
  dayTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 10,
  },
  dayText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 18,
  },
  dateText: {
    fontSize: 14,
    marginTop: 2,
  },
  iconButton: {
    padding: 5,
  },
  emoji: {
    fontSize: 24,
  },
});

export default SunriseListItem;
