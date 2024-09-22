import React from 'react';
import SunriseAlarm from './src/SunriseAlarm';
import {ThemeProvider} from './src/ThemeContext';

const App = () => {
  return (
    <ThemeProvider>
      <SunriseAlarm />
    </ThemeProvider>
  );
};

export default App;
