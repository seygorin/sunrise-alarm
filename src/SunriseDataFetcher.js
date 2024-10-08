import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.sunrisesunset.io/json';

const SunriseDataFetcher = {
  async fetchSunriseData(location) {
    if (!location || !location.latitude || !location.longitude) {
      console.error('Invalid location:', location);
      throw new Error('Invalid location');
    }

    console.log(
      'Fetching sunrise data for location:',
      JSON.stringify(location),
    );

    const cachedData = await this.getCachedData();
    if (cachedData) {
      console.log('Returning cached data');
      return cachedData;
    }

    const today = new Date();
    const sunrises = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const formattedDate = this.formatDate(date);

      const url = `${API_BASE_URL}?lat=${location.latitude}&lng=${location.longitude}&date=${formattedDate}`;
      console.log('Fetching sunrise for date:', formattedDate, 'URL:', url);

      try {
        const response = await axios.get(url);
        console.log(
          'Response for date',
          formattedDate,
          ':',
          JSON.stringify(response.data),
        );
        if (response.data && response.data.results) {
          sunrises.push(response.data.results);
        } else {
          throw new Error('Invalid response data');
        }
      } catch (error) {
        console.error(
          'Error fetching sunrise for date:',
          formattedDate,
          'Error:',
          error.message,
        );
        throw error;
      }
    }

    if (sunrises.length === 0) {
      throw new Error('No sunrise data received');
    }

    const data = {sunrises, timezone: sunrises[0].timezone};
    console.log('Fetched new data:', JSON.stringify(data));

    await this.cacheData(data);

    return data;
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  async getCachedData() {
    try {
      const cachedData = await AsyncStorage.getItem('sunriseData');
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.error('Error retrieving cached data:', error);
    }
    return null;
  },

  async cacheData(data) {
    try {
      await AsyncStorage.setItem('sunriseData', JSON.stringify(data));
      console.log('Data cached successfully');
    } catch (error) {
      console.error('Error caching data:', error);
    }
  },

  async clearCachedData() {
    try {
      await AsyncStorage.removeItem('sunriseData');
      console.log('Cached data cleared');
    } catch (error) {
      console.error('Error clearing cached data:', error);
    }
  },
};

export default SunriseDataFetcher;
