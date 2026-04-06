const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const INSET = '22%';

const ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/iconBackground"/>
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="${INSET}"/>
    </foreground>
</adaptive-icon>`;

module.exports = function withAdaptiveIconInset(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/mipmap-anydpi-v26');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'ic_launcher.xml'), ICON_XML);
      fs.writeFileSync(path.join(dir, 'ic_launcher_round.xml'), ICON_XML);
      return cfg;
    },
  ]);
};
