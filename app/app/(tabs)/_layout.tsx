import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '../../src/utils/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: Colors.accentBlue,
        tabBarInactiveTintColor: Colors.textDisabled,
        tabBarLabelStyle: {
          ...Typography.label,
          marginBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

// ─── Inline icons (no external package — avoids monorepo React duplication) ──

function HomeIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 22, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* Roof */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          width: 0,
          height: 0,
          borderLeftWidth: 12,
          borderRightWidth: 12,
          borderBottomWidth: 10,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
      {/* Chimney */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 15,
          width: 3,
          height: 5,
          backgroundColor: color,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: 16,
          height: 11,
          backgroundColor: color,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />
    </View>
  );
}

function SettingsIcon({ color }: { color: string }) {
  // Outer ring with cutouts approximated by layering circles
  const S = 22;
  const outerR = S / 2;
  const innerR = outerR * 0.42;
  const toothW = outerR * 0.28;
  const toothH = outerR * 0.22;

  return (
    <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      {/* Gear body (outer ring) */}
      <View
        style={{
          width: S * 0.72,
          height: S * 0.72,
          borderRadius: (S * 0.72) / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Inner hole */}
        <View
          style={{
            width: S * 0.3,
            height: S * 0.3,
            borderRadius: (S * 0.3) / 2,
            backgroundColor: Colors.surface,
          }}
        />
      </View>
      {/* 4 teeth (top, bottom, left, right) */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const dist = (S * 0.72) / 2 - 1;
        const tx = Math.round(Math.cos(rad) * dist);
        const ty = Math.round(Math.sin(rad) * dist);
        const isVertical = deg === 0 || deg === 180;
        return (
          <View
            key={deg}
            style={{
              position: 'absolute',
              width: isVertical ? toothW : toothH,
              height: isVertical ? toothH : toothW,
              backgroundColor: color,
              borderRadius: 1,
              transform: [{ translateX: tx }, { translateY: ty }],
            }}
          />
        );
      })}
    </View>
  );
}
