import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationManager from './LocationManager';
import SunriseDataFetcher from './SunriseDataFetcher';
import {NativeModules} from 'react-native';
import {ThemeContext} from './ThemeContext';
import notifee from '@notifee/react-native';
import SunriseListItem from './SunriseListItem';

const {AlarmModule} = NativeModules;

const SunriseAlarm = () => {
  const [originalSunrises, setOriginalSunrises] = useState([]);
  const [minutesOffset, setMinutesOffset] = useState(0);
  const [location, setLocation] = useState(null);
  const [timezone, setTimezone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const {theme, toggleTheme, isDark} = useContext(ThemeContext);

  const showNotification = useCallback(async (title, body) => {
    await notifee.requestPermission();

    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
    });

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
      },
    });
  }, []);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedOffset = await AsyncStorage.getItem('minutesOffset');
      if (savedOffset !== null) {
        setMinutesOffset(parseInt(savedOffset, 10));
      }

      const savedLocation = await AsyncStorage.getItem('location');
      if (savedLocation !== null) {
        setLocation(JSON.parse(savedLocation));
      } else {
        const newLocation = await LocationManager.getCurrentLocation();
        setLocation(newLocation);
        await AsyncStorage.setItem('location', JSON.stringify(newLocation));
      }

      const cachedData = await AsyncStorage.getItem('cachedSunriseData');
      if (cachedData) {
        const {data, timestamp} = JSON.parse(cachedData);
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setOriginalSunrises(processSunriseData(data.sunrises));
          setTimezone(data.timezone || '');
          return;
        }
      }

      await loadSunriseData();
    } catch (err) {
      showNotification('Error', 'Failed to load initial data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [processSunriseData, loadSunriseData, showNotification]);

  useEffect(() => {
    const initializeApp = async () => {
      await loadInitialData();
      loadSunriseData();
    };
    initializeApp();
  }, [loadInitialData, loadSunriseData]);

  const loadSunriseData = useCallback(async () => {
    if (!location) {
      showNotification(
        'Info',
        'Location not available, skipping sunrise data fetch',
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await SunriseDataFetcher.fetchSunriseData(location);
      if (data && data.sunrises && data.sunrises.length > 0) {
        const processedSunrises = processSunriseData(data.sunrises);
        setOriginalSunrises(processedSunrises);
        setTimezone(data.timezone || '');

        await AsyncStorage.setItem(
          'cachedSunriseData',
          JSON.stringify({
            data,
            timestamp: Date.now(),
          }),
        );
        showNotification('Success', 'Sunrise data loaded successfully');
      } else {
        throw new Error('Invalid sunrise data received');
      }
    } catch (err) {
      const errorMessage = 'Failed to load sunrise data: ' + err.message;
      showNotification('Error', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [location, processSunriseData, showNotification]);

  const processSunriseData = useMemo(
    () => sunrises => {
      return sunrises
        .map(sunriseData => {
          try {
            const [datePart] = sunriseData.date.split('T');
            const [year, month, day] = datePart.split('-');
            const [hours, minutes] = sunriseData.sunrise.split(':');
            const sunriseDate = new Date(
              year,
              month - 1,
              day,
              parseInt(hours, 10),
              parseInt(minutes, 10),
            );
            if (isNaN(sunriseDate.getTime())) {
              showNotification(
                'Error',
                'Invalid date: ' + JSON.stringify(sunriseData),
              );
              return null;
            }
            return sunriseDate;
          } catch (err) {
            showNotification(
              'Error',
              'Error processing sunrise date: ' +
                JSON.stringify(sunriseData) +
                ' Error: ' +
                err.message,
            );
            return null;
          }
        })
        .filter(date => date !== null);
    },
    [showNotification],
  );

  const getAdjustedSunrises = () => {
    return originalSunrises
      .map(sunrise => {
        if (!(sunrise instanceof Date)) {
          showNotification(
            'Error',
            'Invalid sunrise date: ' + JSON.stringify(sunrise),
          );
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

  const handleMinutesOffsetChange = async newOffset => {
    setMinutesOffset(newOffset);
    await AsyncStorage.setItem('minutesOffset', newOffset.toString());
  };

  const setAlarm = async (sunriseTime, dayOfWeek) => {
    const alarmTime = new Date(sunriseTime.getTime() + minutesOffset * 60000);
    const message = `Sunrise Alarm ${getDayName(dayOfWeek)}`;
    try {
      await AlarmModule.setAlarm(
        alarmTime.getHours(),
        alarmTime.getMinutes(),
        dayOfWeek,
        message,
      );
      showNotification(
        'Success',
        `Alarm set/updated for ${alarmTime.toLocaleTimeString()} on ${
          formatDate(alarmTime).fullDate
        }`,
      );
    } catch (err) {
      showNotification('Error', 'Failed to set/update alarm: ' + err.message);
    }
  };

  const setAllAlarms = async () => {
    const adjustedSunrises = getAdjustedSunrises();

    for (let i = 0; i < adjustedSunrises.length; i++) {
      const dayOfWeek = ((i + 1) % 7) + 1;
      await setAlarm(adjustedSunrises[i], dayOfWeek);
    }

    showNotification(
      'Success',
      'All alarms for the week have been set/updated.',
    );
  };

  const getDayName = dayOfWeek => {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[dayOfWeek - 1];
  };

  const handleLocationUpdate = useCallback(
    async newLocation => {
      if (!newLocation || !newLocation.latitude || !newLocation.longitude) {
        showNotification('Error', 'Invalid location');
        return;
      }
      if (JSON.stringify(newLocation) !== JSON.stringify(location)) {
        setLocation(newLocation);
        showNotification(
          'Info',
          'New location set: ' + JSON.stringify(newLocation),
        );
        try {
          await AsyncStorage.setItem('location', JSON.stringify(newLocation));
          showNotification('Info', 'Location saved to AsyncStorage');
          await SunriseDataFetcher.clearCachedData();
          showNotification('Info', 'Cached data cleared');
          await loadSunriseData();
          showNotification('Info', 'Sunrise data reloaded');
        } catch (err) {
          showNotification(
            'Error',
            'Failed to update location: ' + error.message,
          );
        }
      } else {
        showNotification('Info', 'Location unchanged');
      }
    },
    [location, loadSunriseData, showNotification, error],
  );

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
          <LocationManager
            onLocationUpdate={handleLocationUpdate}
            showNotification={showNotification}
          />
          <Text style={[styles.timezoneText, {color: theme.foreground}]}>
            Timezone:{' '}
            <Text style={[styles.timezoneValue, {color: theme.accent}]}>
              {timezone || 'Not set'}
            </Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={loadSunriseData}
          accessibilityLabel="Update sunrise data">
          <Text style={[styles.buttonText, {color: theme.foreground}]}>
            Update Sunrises
          </Text>
          <Text style={styles.emoji}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, isLoading && styles.disabledButton]}
          onPress={setAllAlarms}
          disabled={isLoading}
          accessibilityLabel="Set all alarms for the week">
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
        {adjustedSunrises.map((sunrise, index) => (
          <SunriseListItem
            key={index}
            sunrise={sunrise}
            onSetAlarm={setAlarm}
            theme={theme}
            minutesOffset={minutesOffset}
            isToday={isToday(sunrise)}
          />
        ))}
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
