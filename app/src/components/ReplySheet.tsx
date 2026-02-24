import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useReplyStore } from '../store/useReplyStore';
import { Colors, Radius, Spacing, Typography } from '../utils/theme';
import { ReplyCard } from './ReplyCard';

interface ReplySheetProps {
  visible: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export function ReplySheet({ visible, onClose, onRetry }: ReplySheetProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const { suggestions, capturedText, isLoading, error } = useReplyStore();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible, slideAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.scrim} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reply Suggestions</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {capturedText ? (
          <Text style={styles.preview} numberOfLines={2}>
            "{capturedText}"
          </Text>
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <Text style={styles.status}>Generating replies…</Text>
          ) : error ? (
            <>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
                <Text style={styles.retryLabel}>Try again</Text>
              </TouchableOpacity>
            </>
          ) : (
            suggestions.map((reply) => <ReplyCard key={reply.id} text={reply.text} />)
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.scrim,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
  },
  closeBtn: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  preview: {
    ...Typography.caption,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  status: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    alignSelf: 'center',
  },
  retryLabel: {
    ...Typography.label,
    color: Colors.accentBlue,
  },
});
