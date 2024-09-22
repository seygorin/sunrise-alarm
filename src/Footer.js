import React from 'react';
import {View, Text, TouchableOpacity, Linking, StyleSheet} from 'react-native';

const Footer = () => {
  const openGitHub = () => {
    Linking.openURL('https://github.com/seygorin');
  };

  return (
    <View style={styles.footer}>
      <TouchableOpacity onPress={openGitHub}>
        <Text style={styles.link}>by seygorin</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  link: {
    fontSize: 12,
    color: '#475569',
  },
});

export default Footer;
