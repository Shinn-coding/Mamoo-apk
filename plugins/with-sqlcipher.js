/**
 * Config plugin: mengaktifkan SQLCipher pada expo-sqlite.
 *
 * expo-sqlite hanya memakai SQLCipher kalau properti Gradle
 * `expo.sqlite.useSQLCipher=true` ada saat compile. Di managed workflow,
 * properti ini disuntikkan lewat plugin saat `expo prebuild` berjalan
 * (EAS juga menjalankan prebuild otomatis saat build).
 */
const { withGradleProperties } = require('@expo/config-plugins');

const PROPERTY_KEY = 'expo.sqlite.useSQLCipher';

module.exports = function withSqlCipher(config) {
  return withGradleProperties(config, (cfg) => {
    const items = Array.isArray(cfg.modResults) ? cfg.modResults : [];
    const existing = items.find(
      (item) => item.type === 'property' && item.key === PROPERTY_KEY,
    );

    if (existing) {
      existing.value = 'true';
    } else {
      items.push({ type: 'property', key: PROPERTY_KEY, value: 'true' });
    }

    cfg.modResults = items;
    return cfg;
  });
};
