import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface ThemedTextProps extends TextProps {
  type?: 'title' | 'default' | 'defaultSemiBold';
}

export function ThemedText({
  type = 'default',
  style,
  ...props
}: ThemedTextProps) {
  return <Text style={[styles[type], style]} {...props} />;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  default: {
    fontSize: 16,
    color: '#333',
  },
  defaultSemiBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
