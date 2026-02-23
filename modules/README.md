# Native Modules

This directory contains custom native modules that bridge platform-specific APIs into React Native.

## Planned Modules

### `screen-capture/` (Android)
- Uses Android's **MediaProjection API** to capture screen content
- Exposes a React Native module via Expo Modules API
- Required permissions: `FOREGROUND_SERVICE`, `MEDIA_PROJECTION`

### `keyboard-extension/` (iOS)
- Custom Keyboard Extension for iOS
- Accesses text input context within the keyboard host app sandbox
- Limited screen access by design (Apple guideline compliance)

## Guidelines
- All native bridging code must be thoroughly documented
- Follow Expo Modules API patterns for new module creation
- Keep platform-specific logic isolated within each module directory
