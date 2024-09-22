import React, { useEffect, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';

const DEFAULT_LOCATION = { latitude: 51.4769, longitude: 0.0005 };

const LocationManager = ({ onLocationUpdate }) => {
  useEffect(() => {
    updateLocation();
  }, [updateLocation]);

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        error => {
          console.error('Error getting location:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  const updateLocation = useCallback(async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      onLocationUpdate(DEFAULT_LOCATION);
      return;
    }

    try {
      const newLocation = await getLocation();
      onLocationUpdate(newLocation);
    } catch (error) {
      console.error('Error getting location:', error);
      onLocationUpdate(DEFAULT_LOCATION);
    }
  }, [onLocationUpdate]);

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
