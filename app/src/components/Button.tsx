import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

export function Button({ label, variant = 'primary', loading = false, style, ...rest }: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.base, styles[variant], style]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.accentBlue} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  primary: {
    backgroundColor: Colors.accentBlue,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  label: {
    ...Typography.label,
  },
  primaryLabel: {
    color: '#fff',
  },
  secondaryLabel: {
    color: Colors.textPrimary,
  },
  ghostLabel: {
    color: Colors.accentBlue,
  },
});
