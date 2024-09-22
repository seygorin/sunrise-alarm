# Sunrise Alarm

Sunrise Alarm is a React Native application that sets alarms based on sunrise times. It provides a unique way to wake up naturally with the sun.

## Features

- Set alarms synchronized with local sunrise times
- Customizable alarm settings
- Geolocation support for accurate sunrise times
- Beautiful gradient UI

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm (version 10 or higher)
- React Native development environment set up for Android

### Installation

1. Clone the repository
2. Install dependencies:

   ```
   npm install
   ```

### Running the app

For Android:

`npx react-native run-android`

## Dependencies

- React Native 0.75.3
- @notifee/react-native: For handling notifications
- @react-native-async-storage/async-storage: For local data storage
- @react-native-community/geolocation: For getting device location
- axios: For making HTTP requests
- react-native-linear-gradient: For creating gradient backgrounds

## Native Modules

The app includes a custom native module for Android (`AlarmModule`) that interfaces with the device's alarm system.
