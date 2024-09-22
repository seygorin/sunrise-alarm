import React, {useState, useEffect, useCallback, useContext} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationManager from './LocationManager';
import SunriseDataFetcher from './SunriseDataFetcher';
import {NativeModules} from 'react-native';
import {ThemeContext} from './ThemeContext';

const {AlarmModule} = NativeModules;

const SunriseAlarm = () => {
  const [originalSunrises, setOriginalSunrises] = useState([]);
  const [minutesOffset, setMinutesOffset] = useState(0);
  const [location, setLocation] = useState(null);
  const [timezone, setTimezone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const {theme, toggleTheme, isDark} = useContext(ThemeContext);

  const loadInitialData = useCallback(async () => {
    try {
      const savedOffset = await AsyncStorage.getItem('minutesOffset');
      if (savedOffset !== null) {
        setMinutesOffset(parseInt(savedOffset, 10));
      }

      const savedLocation = await AsyncStorage.getItem('location');
      if (savedLocation !== null) {
        setLocation(JSON.parse(savedLocation));
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load initial data');
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadSunriseData = useCallback(async () => {
    if (!location) {
      console.log('Location not available, skipping sunrise data fetch');
      setIsLoading(false);
      return;
    }

//    setIsLoading(true);
    setError(null);
    try {
      console.log(
        'Loading sunrise data for location:',
        JSON.stringify(location),
      );
      const data = await SunriseDataFetcher.fetchSunriseData(location);
      console.log('Received sunrise data:', JSON.stringify(data));
      if (data && data.sunrises && data.sunrises.length > 0) {
        const processedSunrises = processSunriseData(data.sunrises);
        setOriginalSunrises(processedSunrises);
        setTimezone(data.timezone || '');
      } else {
        throw new Error('Invalid sunrise data received');
      }
    } catch (error) {
      console.error('Error loading sunrise data:', error.message, error.stack);
      setError('Failed to load sunrise data: ' + error.message);
      Alert.alert('Error', 'Failed to load sunrise data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (location) {
      loadSunriseData();
    }
  }, [location, loadSunriseData]);

  const processSunriseData = sunrises => {
    return sunrises
      .map(sunriseData => {
        try {
          const [datePart, timePart] = sunriseData.date.split('T');
          const [year, month, day] = datePart.split('-');
          const [hours, minutes] = sunriseData.sunrise.split(':');
          const sunriseDate = new Date(
            year,
            month - 1,
            day,
            parseInt(hours),
            parseInt(minutes),
          );
          if (isNaN(sunriseDate.getTime())) {
            console.error('Invalid date:', sunriseData);
            return null;
          }
          return sunriseDate;
        } catch (error) {
          console.error(
            'Error processing sunrise date:',
            sunriseData,
            'Error:',
            error.message,
          );
          return null;
        }
      })
      .filter(date => date !== null);
  };

  const getAdjustedSunrises = () => {
    return originalSunrises
      .map(sunrise => {
        if (!(sunrise instanceof Date)) {
          console.error('Invalid sunrise date:', sunrise);
          return null;
        }
        const adjustedTime = new Date(
          sunrise.getTime() + minutesOffset * 60000,
        );
        return adjustedTime;
      })
      .filter(date => date !== null);
  };

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

    return {dayOfWeek, fullDate, time};
  };

  const isToday = date => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleLocationUpdate = useCallback(
    async newLocation => {
      if (!newLocation || !newLocation.latitude || !newLocation.longitude) {
        console.error('Invalid location:', newLocation);
        return;
      }
      if (JSON.stringify(newLocation) !== JSON.stringify(location)) {
        setLocation(newLocation);
        await AsyncStorage.setItem('location', JSON.stringify(newLocation));
        await SunriseDataFetcher.clearCachedData();
      }
    },
    [location],
  );

  const handleMinutesOffsetChange = async newOffset => {
    setMinutesOffset(newOffset);
    await AsyncStorage.setItem('minutesOffset', newOffset.toString());
  };

  const setAlarm = async (sunriseTime, dayOfWeek) => {
    const alarmTime = new Date(sunriseTime.getTime() + minutesOffset * 60000);
    const message = `Sunrise Alarm ${dayOfWeek}`;
    try {
      await AlarmModule.setAlarm(
        alarmTime.getHours(),
        alarmTime.getMinutes(),
        dayOfWeek,
        message,
      );
      console.log(
        `Alarm set/updated for ${alarmTime.toLocaleTimeString()} on ${
          formatDate(alarmTime).fullDate
        }`,
      );
    } catch (error) {
      console.error('Error setting/updating alarm:', error);
      Alert.alert('Error', 'Failed to set/update alarm');
    }
  };

  const setAllAlarms = async () => {
    const adjustedSunrises = getAdjustedSunrises();

    for (let i = 0; i < adjustedSunrises.length; i++) {
      const dayOfWeek = (i + 1) % 7;
      await setAlarm(adjustedSunrises[i], dayOfWeek === 0 ? 7 : dayOfWeek);
    }

    Alert.alert('Success', 'All alarms for the week have been set/updated.');
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {backgroundColor: theme.backgroundStart},
        ]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{color: theme.foreground}}>Loading sunrise data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.errorContainer,
          {backgroundColor: theme.backgroundStart},
        ]}>
        <Text style={[styles.errorText, {color: theme.foreground}]}>
          {error}
        </Text>
        <TouchableOpacity style={styles.iconButton} onPress={loadSunriseData}>
          <Text style={styles.emoji}>🔄</Text>
          <Text style={[styles.buttonText, {color: theme.foreground}]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const adjustedSunrises = getAdjustedSunrises();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={[styles.title, {color: theme.foreground}]}>
          Sunrise Alarm
        </Text>
        <View style={styles.timezoneContainer}>
          <LocationManager onLocationUpdate={handleLocationUpdate} />
          <Text style={[styles.timezoneText, {color: theme.foreground}]}>
            Timezone:{' '}
            <Text style={[styles.timezoneValue, {color: theme.accent}]}>
              {timezone || 'Not set'}
            </Text>
          </Text>
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={loadSunriseData}>
          <Text style={[styles.buttonText, {color: theme.foreground}]}>
            Update Sunrises
          </Text>
          <Text style={styles.emoji}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, isLoading && styles.disabledButton]}
          onPress={setAllAlarms}
          disabled={isLoading}>
          <Text style={[styles.buttonText, {color: theme.foreground}]}>
            Set All Alarms for Week
          </Text>
          <Text style={styles.emoji}>⏰</Text>
        </TouchableOpacity>

        <View style={styles.offsetContainer}>
          <Text style={[styles.offsetText, {color: theme.foreground}]}>
            Minutes offset:
          </Text>
          <TouchableOpacity
            onPress={() => handleMinutesOffsetChange(minutesOffset - 5)}>
            <Text style={styles.emoji}>⬅️</Text>
          </TouchableOpacity>
          <Text style={[styles.offsetValue, {color: theme.foreground}]}>
            {minutesOffset}
          </Text>
          <TouchableOpacity
            onPress={() => handleMinutesOffsetChange(minutesOffset + 5)}>
            <Text style={styles.emoji}>➡️</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, {color: theme.foreground}]}>
          Upcoming Sunrises:
        </Text>
        {adjustedSunrises.map((sunrise, index) => {
          const {dayOfWeek, fullDate, time} = formatDate(sunrise);
          return (
            <View key={index} style={styles.sunriseItem}>
              <View style={styles.sunriseInfo}>
                <View style={styles.dayTimeContainer}>
                  <Text
                    style={[
                      styles.dayText,
                      {color: theme.foreground},
                      isToday(sunrise) && {color: theme.accent},
                    ]}>
                    {dayOfWeek}
                  </Text>
                  <Text style={[styles.timeText, {color: theme.foreground}]}>
                    {time}
                    {minutesOffset !== 0 &&
                      ` (${minutesOffset > 0 ? '+' : ''}${minutesOffset} min)`}
                  </Text>
                </View>
                <Text style={[styles.dateText, {color: theme.foreground}]}>
                  {fullDate}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setAlarm(sunrise, sunrise.getDay() + 1)}>
                <Text style={styles.emoji}>🔔</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
        <Text style={styles.emoji}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  timezoneContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timezoneText: {
    fontSize: 18,
    marginLeft: 10,
  },
  timezoneValue: {
    fontWeight: 'bold',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 24,
    marginRight: 10,
  },
  buttonText: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
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
  disabledButton: {
    opacity: 0.5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
  themeToggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
    zIndex: 1,
  },
  offsetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  offsetText: {
    fontSize: 16,
    marginRight: 10,
  },
  offsetValue: {
    fontSize: 18,
    fontWeight: 'bold',
		marginLeft: -1,
    marginHorizontal: 10,
  },
});

export default SunriseAlarm;
