import React, {useState} from 'react';
import {View, TextInput, TouchableOpacity, Text, StyleSheet} from 'react-native';

const LocationInput = ({onLocationSubmit, theme}) => {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const handleSubmit = () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      onLocationSubmit({latitude: lat, longitude: lon});
      setLatitude('');
      setLongitude('');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, {color: theme.foreground, borderColor: theme.foreground}]}
        placeholder="Latitude"
        placeholderTextColor={theme.foreground}
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numeric"
      />
      <TextInput
        style={[styles.input, {color: theme.foreground, borderColor: theme.foreground}]}
        placeholder="Longitude"
        placeholderTextColor={theme.foreground}
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numeric"
      />
      <TouchableOpacity
        style={[styles.button, {backgroundColor: theme.accent}]}
        onPress={handleSubmit}>
        <Text style={[styles.buttonText, {color: theme.backgroundStart}]}>
          Set Location
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    padding: 10,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LocationInput;
