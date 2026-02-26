const {
  withAndroidManifest,
  withAppBuildGradle,
  createRunOncePlugin,
} = require('@expo/config-plugins');

/**
 * Add permissions and service declaration to AndroidManifest.xml
 */
function withBubbleManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Ensure <uses-permission> entries exist
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
    ];

    for (const perm of permissions) {
      const already = manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === perm,
      );
      if (!already) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    // Add BubbleService to the application
    const application = manifest.application?.[0];
    if (application) {
      if (!application.service) {
        application.service = [];
      }

      const serviceAlready = application.service.some(
        (s) => s.$?.['android:name'] === '.screencapture.BubbleService',
      );

      if (!serviceAlready) {
        if (!application.property) application.property = [];
        const propAlready = application.property.some(
          (p) => p.$?.['android:name'] === 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
        );
        if (!propAlready) {
          application.property.push({
            $: { 'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE', 'android:value': 'screen_capture_bubble' },
          });
        }
        application.service.push({
          $: {
            'android:name': 'com.aireplyassistant.screencapture.BubbleService',
            'android:exported': 'false',
            'android:foregroundServiceType': 'specialUse',
          },
        });
      }
    }

    return cfg;
  });
}

/**
 * Add ML Kit and OkHttp dependencies to android/app/build.gradle
 */
function withBubbleGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;

    const mlkitDep = "implementation 'com.google.mlkit:text-recognition:16.0.1'";
    const okhttpDep = "implementation 'com.squareup.okhttp3:okhttp:4.12.0'";

    if (!gradle.includes(mlkitDep)) {
      cfg.modResults.contents = gradle.replace(
        /dependencies\s*\{/,
        `dependencies {\n    ${mlkitDep}\n    ${okhttpDep}`,
      );
    }

    return cfg;
  });
}

/**
 * Combined plugin
 */
function withScreenCapture(config) {
  config = withBubbleManifest(config);
  config = withBubbleGradle(config);
  return config;
}

module.exports = createRunOncePlugin(withScreenCapture, 'withScreenCapture', '1.0.0');
