import { Tabs } from 'expo-router';
import { Colors, Typography } from '../../src/utils/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
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
          tabBarIcon: ({ color }) => (
            <TabIcon glyph="⬛" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon glyph="⚙" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// Minimal icon — swap for @expo/vector-icons when installed
function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}
