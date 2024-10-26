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
import Footer from './Footer';

const {AlarmModule} = NativeModules;

const SunriseAlarm = () => {
  const [originalSunrises, setOriginalSunrises] = useState([]);
  const [minutesOffset, setMinutesOffset] = useState(0);
  const [location, setLocation] = useState(null);
  const [timezone, setTimezone] = useState('');
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
    try {
      const savedOffset = await AsyncStorage.getItem('minutesOffset');
      if (savedOffset !== null) {
        setMinutesOffset(parseInt(savedOffset, 10));
      }

      const savedLocation = await AsyncStorage.getItem('location');
      if (savedLocation) {
        const parsedLocation = JSON.parse(savedLocation);
        if (parsedLocation?.latitude && parsedLocation?.longitude) {
          setLocation(parsedLocation);
        }
      }
    } catch (err) {
      showNotification('Error', 'Failed to load initial data: ' + err.message);
    }
  }, [showNotification]);

  const loadSunriseData = useCallback(
    async (forceUpdate = false) => {
      if (!location) {
        return;
      }

      if (location.latitude === 51.4769 && location.longitude === 0.0005) {
        return;
      }

      try {
        const data = await SunriseDataFetcher.fetchSunriseData(
          location,
          forceUpdate,
        );

        if (data?.sunrises?.length > 0) {
          setOriginalSunrises(processSunriseData(data.sunrises));
          setTimezone(data.timezone || 'Not set');
        }
      } catch (err) {
        showNotification(
          'Error',
          'Failed to load sunrise data: ' + err.message,
        );
        setError(err.message);
        setTimezone('Not set');
      }
    },
    [location, processSunriseData, showNotification],
  );

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (location) {
      loadSunriseData(true);
    }
  }, [location, loadSunriseData]);

  const processSunriseData = useMemo(
    () => sunrises => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return sunrises
        .map(sunriseData => {
          try {
            const [datePart] = sunriseData.date.split('T');
            const [year, month, day] = datePart.split('-');
            const sunriseDate = new Date(
              year,
              month - 1,
              day,
              parseInt(sunriseData.sunrise, 10),
              parseInt(sunriseData.sunrise.split(':')[1], 10),
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
        .filter(date => date !== null)

        .sort((a, b) => {
          const todayTime = today.getTime();
          const aTime = a.getTime();
          const bTime = b.getTime();

          const aDiff =
            aTime < todayTime
              ? aTime - todayTime + 1000 * 60 * 60 * 24 * 7
              : aTime - todayTime;
          const bDiff =
            bTime < todayTime
              ? bTime - todayTime + 1000 * 60 * 60 * 24 * 7
              : bTime - todayTime;

          return aDiff - bDiff;
        });
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

        const adjustedTime = new Date(sunrise);

        adjustedTime.setMinutes(adjustedTime.getMinutes() + minutesOffset);
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
    try {
      await AsyncStorage.setItem('minutesOffset', newOffset.toString());
    } catch (error) {
      showNotification(
        'Error',
        'Failed to save minutes offset: ' + error.message,
      );
    }
  };

  const setAlarm = async (sunriseTime, dayOfWeek) => {
    const androidDayOfWeek = dayOfWeek;

    const alarmTime = new Date(sunriseTime);
    const hours = alarmTime.getHours();
    const minutes = alarmTime.getMinutes();

    const message = `Sunrise Alarm ${getDayName(androidDayOfWeek)}`;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await AlarmModule.setAlarm(hours, minutes, androidDayOfWeek, message);
      showNotification(
        'Success',
        `Alarm set for ${alarmTime.toLocaleTimeString()} on ${
          formatDate(alarmTime).fullDate
        }`,
      );
    } catch (err) {
      showNotification('Error', 'Failed to set alarm: ' + err.message);
    }
  };

  const setAllAlarms = async () => {
    const adjustedSunrises = getAdjustedSunrises();
    const today = new Date().getDay();

    try {
      for (let i = 0; i < 7; i++) {
        const sunriseTime = new Date(adjustedSunrises[i]);

        const dayOfWeek = ((today + i) % 7) + 1;

        await setAlarm(sunriseTime, dayOfWeek);
      }
      showNotification('Success', 'All alarms for the week have been set.');
    } catch (err) {
      showNotification('Error', 'Failed to set alarms: ' + err.message);
    }
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
    newLocation => {
      if (
        !newLocation ||
        typeof newLocation.latitude !== 'number' ||
        typeof newLocation.longitude !== 'number'
      ) {
        return;
      }

      if (
        newLocation.latitude === 51.4769 &&
        newLocation.longitude === 0.0005
      ) {
        return;
      }

      if (
        location?.latitude === newLocation.latitude &&
        location?.longitude === newLocation.longitude
      ) {
        return;
      }

      setLocation(newLocation);
    },
    [location],
  );

  const handleRefresh = () => {
    loadSunriseData(true);
    showNotification('Success', 'Sunrise data refreshed');
  };

  if (!location) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContainer,
          {backgroundColor: theme.background},
        ]}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator
            size="large"
            color={theme.accent}
            style={styles.indicator}
          />
          <Text style={[styles.loadingText, {color: theme.foreground}]}>
            Getting your location...
          </Text>
        </View>
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
        <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
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
          onPress={handleRefresh}
          accessibilityLabel="Update sunrise data">
          <Text style={[styles.buttonText, {color: theme.foreground}]}>
            Update Sunrises
          </Text>
          <Text style={styles.emoji}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={setAllAlarms}
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
      <Footer />
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
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingWrapper: {
    alignItems: 'center',
    gap: 20,
  },
  indicator: {
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default SunriseAlarm;
