import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PermissionStatus } from '../types';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';

interface PermissionStatusCardProps {
  label: string;
  status: PermissionStatus;
  onGrant: () => void;
}

const STATUS_COLOR: Record<PermissionStatus, string> = {
  granted: Colors.success,
  denied: Colors.error,
  not_asked: Colors.textSecondary,
};

const STATUS_LABEL: Record<PermissionStatus, string> = {
  granted: '✓ Granted',
  denied: '✕ Denied',
  not_asked: 'Not yet granted',
};

export function PermissionStatusCard({ label, status, onGrant }: PermissionStatusCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.status, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
      </View>
      {status !== 'granted' && (
        <TouchableOpacity onPress={onGrant} style={styles.grantBtn} activeOpacity={0.75}>
          <Text style={styles.grantLabel}>Grant</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  label: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  status: {
    ...Typography.caption,
  },
  grantBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentBlue,
  },
  grantLabel: {
    ...Typography.label,
    color: '#fff',
  },
});
