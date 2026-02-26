const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

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
 * Write a fully custom MainActivity.kt that:
 *  - Handles the MediaProjection consent intent forwarded from BubbleService
 *  - Broadcasts the result back via LocalBroadcastManager
 *  - Calls moveTaskToBack(true) so the user's app is visible when OCR fires
 */
function withBubbleMainActivity(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const packageName = cfg.android?.package ?? 'com.aireplyassistant.app';
      const packagePath = packageName.replace(/\./g, '/');
      const mainActivityPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java',
        packagePath,
        'MainActivity.kt',
      );

      const content = `package ${packageName}

import android.content.Intent
import android.os.Build
import android.os.Bundle

import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

  companion object {
    const val ACTION_REQUEST_MEDIA_PROJECTION = "com.aireplyassistant.REQUEST_MEDIA_PROJECTION"
    const val EXTRA_MEDIA_PROJECTION_INTENT = "media_projection_intent"
    // Must match BubbleService.MEDIA_PROJECTION_REQUEST_CODE
    private const val MEDIA_PROJECTION_REQUEST_CODE = 1001
    // Broadcast sent back to BubbleService with the result
    const val ACTION_MEDIA_PROJECTION_RESULT = "com.aireplyassistant.screencapture.MEDIA_PROJECTION_RESULT"
    const val EXTRA_RESULT_CODE = "result_code"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme)
    super.onCreate(null)
    // Handle MediaProjection request forwarded from BubbleService
    handleBubbleIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    handleBubbleIntent(intent)
  }

  private fun handleBubbleIntent(intent: Intent?) {
    if (intent?.action == ACTION_REQUEST_MEDIA_PROJECTION) {
      val projectionIntent = intent.getParcelableExtra<Intent>(EXTRA_MEDIA_PROJECTION_INTENT)
        ?: return
      @Suppress("DEPRECATION")
      startActivityForResult(projectionIntent, MEDIA_PROJECTION_REQUEST_CODE)
    }
  }

  @Deprecated("Deprecated in Java")
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    @Suppress("DEPRECATION")
    super.onActivityResult(requestCode, resultCode, data)
    if (requestCode == MEDIA_PROJECTION_REQUEST_CODE) {
      // Broadcast result to BubbleService via LocalBroadcastManager
      val broadcast = Intent(ACTION_MEDIA_PROJECTION_RESULT).apply {
        putExtra(EXTRA_RESULT_CODE, resultCode)
        putExtra("data", data)
      }
      LocalBroadcastManager.getInstance(this).sendBroadcast(broadcast)
      // Move our app to the background so the user's app is visible when OCR fires
      moveTaskToBack(true)
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate].
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
   * Align the back button behavior with Android S
   * where moving root activities to background instead of finishing activities.
   */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }
      super.invokeDefaultOnBackPressed()
  }
}
`;

      fs.writeFileSync(mainActivityPath, content, 'utf-8');
      return cfg;
    },
  ]);
}

/**
 * Combined plugin
 */
function withScreenCapture(config) {
  config = withBubbleManifest(config);
  config = withBubbleGradle(config);
  config = withBubbleMainActivity(config);
  return config;
}

module.exports = createRunOncePlugin(withScreenCapture, 'withScreenCapture', '1.0.0');
