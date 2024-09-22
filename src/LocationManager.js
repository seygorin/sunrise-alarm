import React, {useEffect, useCallback} from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {PermissionsAndroid} from 'react-native';

const DEFAULT_LOCATION = {latitude: 51.4769, longitude: 0.0005};

const LocationManager = ({onLocationUpdate, showNotification}) => {
  const safeShowNotification = useCallback((title, message) => {
    if (typeof showNotification === 'function') {
      showNotification(title, message);
    } else {
      console.warn('showNotification is not a function', { title, message });
    }
  }, [showNotification]);

  const requestLocationPermission = useCallback(async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      safeShowNotification('Error', 'Failed to request location permission: ' + err.message);
      return false;
    }
  }, [safeShowNotification]);

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          safeShowNotification('Error', 'Error getting location: ' + error.message);
          reject(error);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    });
  }, [safeShowNotification]);

  const updateLocation = useCallback(async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        safeShowNotification(
          'Info',
          'Location permission not granted. Using default location.',
        );
        onLocationUpdate(DEFAULT_LOCATION);
        return;
      }

      const newLocation = await getLocation();
      onLocationUpdate(newLocation);
      safeShowNotification('Success', 'Location updated successfully');
    } catch (error) {
      safeShowNotification(
        'Error',
        'Failed to get location. Using default location.',
      );
      onLocationUpdate(DEFAULT_LOCATION);
    }
  }, [onLocationUpdate, safeShowNotification, getLocation, requestLocationPermission]);

  useEffect(() => {
    updateLocation().catch(error => {
      safeShowNotification('Error', 'Failed to update location: ' + error.message);
    });
  }, [updateLocation, safeShowNotification]);

  return (
    <TouchableOpacity style={styles.iconButton} onPress={updateLocation}>
      <Text style={styles.emoji}>📍</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: 5,
  },
  emoji: {
    fontSize: 24,
  },
});

export default LocationManager;
