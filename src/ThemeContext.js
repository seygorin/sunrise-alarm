import React, {createContext, useState, useEffect} from 'react';
import {Appearance} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const ThemeContext = createContext();

const lightTheme = {
  foreground: 'rgb(88, 101, 122)',
  accent: 'rgb(74, 144, 226)',
  backgroundStart: 'rgb(250, 245, 255)',
  backgroundMid: 'rgb(248, 244, 255)',
  backgroundBlue: 'rgb(245, 250, 255)',
  backgroundGreen: 'rgb(248, 255, 248)',
  backgroundYellow: 'rgb(255, 255, 248)',
  backgroundOrange: 'rgb(255, 250, 245)',
  backgroundEnd: 'rgb(255, 245, 245)',
};

const darkTheme = {
  foreground: 'rgb(215, 225, 235)',
  accent: 'rgb(100, 210, 255)',
  backgroundStart: 'rgb(10, 0, 20)',
  backgroundMid: 'rgb(8, 3, 15)',
  backgroundBlue: 'rgb(5, 5, 20)',
  backgroundGreen: 'rgb(3, 20, 3)',
  backgroundYellow: 'rgb(20, 20, 3)',
  backgroundOrange: 'rgb(20, 10, 3)',
  backgroundEnd: 'rgb(20, 0, 0)',
};

const BackgroundGradient = ({theme, children}) => (
  <LinearGradient
    colors={[
      theme.backgroundStart,
      theme.backgroundMid,
      theme.backgroundBlue,
      theme.backgroundGreen,
      theme.backgroundYellow,
      theme.backgroundOrange,
      theme.backgroundEnd,
    ]}
    style={{flex: 1}}>
    {children}
  </LinearGradient>
);

const ThemeProvider = ({children}) => {
  const [isDark, setIsDark] = useState(Appearance.getColorScheme() === 'dark');

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({colorScheme}) => {
      setIsDark(colorScheme === 'dark');
    });
    return () => subscription.remove();
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{theme, toggleTheme, isDark}}>
      <BackgroundGradient theme={theme}>{children}</BackgroundGradient>
    </ThemeContext.Provider>
  );
};

export {ThemeContext, ThemeProvider};
