// Wraps app.json so CI can stamp the version (Play needs a higher versionCode for every upload).
module.exports = ({ config }) => ({
  ...config,
  version: process.env.APP_VERSION_NAME || config.version,
  android: { ...config.android, versionCode: Number(process.env.APP_VERSION_CODE || config.android?.versionCode || 1) },
});
