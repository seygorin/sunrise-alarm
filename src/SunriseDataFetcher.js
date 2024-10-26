import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.sunrisesunset.io/json';

let isLoading = false;

class SunriseDataFetcher {
  static async fetchSunriseData(location, forceUpdate = false) {
    if (!location) {
      return null;
    }

    if (
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      return null;
    }

    if (isLoading) {
      return null;
    }

    try {
      isLoading = true;

      if (!location?.latitude || !location?.longitude) {
        throw new Error('Location is required');
      }

      try {
        if (!forceUpdate) {
          const cachedData = await this.getCachedData();

          if (cachedData?.location && cachedData?.sunrises) {
            const locationChanged =
              Math.abs(cachedData.location.latitude - location.latitude) >
                0.01 ||
              Math.abs(cachedData.location.longitude - location.longitude) >
                0.01;

            const isExpired =
              !cachedData.timestamp ||
              Date.now() - cachedData.timestamp > 24 * 60 * 60 * 1000;

            if (!locationChanged && !isExpired) {
              return cachedData;
            }
          }
        }

        const today = new Date();
        const sunrises = [];
        let timezone = 'Not set';

        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const formattedDate = this.formatDate(date);

          const url = `${API_BASE_URL}?lat=${location.latitude}&lng=${location.longitude}&date=${formattedDate}`;

          const response = await fetch(url);
          const data = await response.json();

          if (data.status !== 'OK') {
            throw new Error(`API Error: ${data.status}`);
          }

          if (i === 0) {
            timezone = data.results.timezone;
          }

          sunrises.push({
            date: formattedDate,
            sunrise: data.results.sunrise,
          });

          if (i < 6) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const resultData = {
          sunrises,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          timezone,
          timestamp: Date.now(),
        };

        await AsyncStorage.setItem('sunriseData', JSON.stringify(resultData));
        return resultData;
      } catch (error) {
        throw error;
      } finally {
        isLoading = false;
      }
    } catch (error) {
      throw error;
    }
  }

  static async getCachedData() {
    try {
      const data = await AsyncStorage.getItem('sunriseData');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  static formatDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + date.getDay());

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  static async clearCachedData() {
    try {
      await AsyncStorage.removeItem('sunriseData');
    } catch (error) {
      throw error;
    }
  }
}

export default SunriseDataFetcher;
