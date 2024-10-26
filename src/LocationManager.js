import React, {useEffect, useCallback, useState} from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LocationManager = ({onLocationUpdate, showNotification}) => {
  const [isInitialized, setIsInitialized] = useState(false);

  const requestLocationPermission = useCallback(async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      showNotification(
        'Error',
        'Failed to request location permission: ' + err.message,
      );
      return false;
    }
  }, [showNotification]);

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          if (!position?.coords?.latitude || !position?.coords?.longitude) {
            reject(new Error('Invalid position data received'));
            return;
          }
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          reject(new Error(error?.message || 'Failed to get location'));
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    });
  }, []);

  const updateLocation = useCallback(async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        showNotification('Error', 'Location permission denied');
        return;
      }

      const newLocation = await getLocation();
      await AsyncStorage.setItem('userLocation', JSON.stringify(newLocation));
      showNotification('Success', 'Location updated');
      onLocationUpdate(newLocation);
    } catch (error) {
      showNotification('Error', 'Failed to get location');
    }
  }, [
    getLocation,
    onLocationUpdate,
    requestLocationPermission,
    showNotification,
  ]);

  useEffect(() => {
    const initializeLocation = async () => {
      if (isInitialized) return;

      try {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          const savedLocation = await AsyncStorage.getItem('userLocation');
          if (savedLocation) {
            onLocationUpdate(JSON.parse(savedLocation));
          }
          setIsInitialized(true);
          return;
        }

        try {
          const currentLocation = await getLocation();

          await AsyncStorage.setItem(
            'userLocation',
            JSON.stringify(currentLocation),
          );
          onLocationUpdate(currentLocation);
          setIsInitialized(true);
        } catch (locationError) {
          showNotification(
            'Error',
            'Failed to get fresh location: ' + locationError.message,
          );

          const savedLocation = await AsyncStorage.getItem('userLocation');
          if (savedLocation) {
            onLocationUpdate(JSON.parse(savedLocation));
          }
          setIsInitialized(true);
        }
      } catch (error) {
        showNotification('Error', 'Init error: ' + error.message);
        setIsInitialized(true);
      }
    };

    const clearSavedLocation = async () => {
      try {
        await AsyncStorage.removeItem('userLocation');
      } catch (error) {
        showNotification(
          'Error',
          'Failed to clear saved location: ' + error.message,
        );
      }
    };

    clearSavedLocation().then(() => initializeLocation());
  }, [
    isInitialized,
    onLocationUpdate,
    getLocation,
    requestLocationPermission,
    showNotification,
  ]);

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
