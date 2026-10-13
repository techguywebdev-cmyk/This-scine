// Signs release builds with the upload key when CI provides it (ANDROID_KEYSTORE_PATH + ANDROID_KEYSTORE_PASSWORD).
// Without those env vars, release builds fall back to the debug key so local builds still work.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            if (System.getenv('ANDROID_KEYSTORE_PATH')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS') ?: 'upload'
                keyPassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes("System.getenv('ANDROID_KEYSTORE_PATH')")) return cfg;
    g = g.replace(/signingConfigs\s*\{/, (m) => `${m}${RELEASE_CONFIG}`);
    // In buildTypes.release, swap the debug signing config for ours
    const i = g.indexOf('buildTypes');
    const r = g.indexOf('release {', i);
    if (i < 0 || r < 0) throw new Error('withReleaseSigning: buildTypes.release not found');
    const head = g.slice(0, r), tail = g.slice(r);
    g = head + tail.replace('signingConfig signingConfigs.debug', "signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug");
    cfg.modResults.contents = g;
    return cfg;
  });
};
