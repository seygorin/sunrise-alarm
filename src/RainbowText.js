import React from 'react';
import {Text} from 'react-native';

const RainbowText = ({text, style}) => {
  return (
    <Text style={style}>
      {text.split('').map((char, index) => (
        <Text
          key={index}
          style={{
            color: getColorForIndex(index, text.length),
            ...style,
          }}>
          {char}
        </Text>
      ))}
    </Text>
  );
};

const getColorForIndex = (index, total) => {
  const position = index / total;

  const colors = [
    '#FFB3BA',
    '#FFDAB3',
    '#FFFFB3',
    '#BAE1BB',
    '#B3E0FF',
    '#D4B3FF',
    '#FFB3E6',
  ];

  const colorIndex = Math.floor(position * (colors.length - 1));
  return colors[colorIndex];
};

export default RainbowText;
