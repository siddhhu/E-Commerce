/**
 * Registers the URL schemes Firebase iOS phone auth needs for its reCAPTCHA
 * fallback (used on simulators and whenever APNs silent verification is not
 * available). Without these schemes iOS throws `auth/missing-client-identifier`.
 *
 * The schemes are derived from GoogleService-Info.plist:
 *   GOOGLE_APP_ID      1:123:ios:abc  ->  app-1-123-ios-abc
 *   REVERSED_CLIENT_ID com.googleusercontent.apps.123-abc
 *
 * The plugin is a no-op (with a warning) when the plist is absent, so Android
 * builds and prebuilds keep working until the iOS Firebase file is added.
 */
const { withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Only project-root locations survive `expo prebuild --clean`.
const CANDIDATES = [process.env.GOOGLE_SERVICE_INFO_PLIST, 'GoogleService-Info.plist'].filter(Boolean);

function findPlist(projectRoot) {
    for (const candidate of CANDIDATES) {
        const file = path.resolve(projectRoot, candidate);
        if (fs.existsSync(file)) return file;
    }
    return null;
}

function plistString(xml, key) {
    const match = xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
    return match ? match[1].trim() : null;
}

module.exports = function withFirebasePhoneAuth(config) {
    const projectRoot = config._internal?.projectRoot ?? process.cwd();
    const plistPath = findPlist(projectRoot);
    if (plistPath && !config.ios?.googleServicesFile) {
        // Hand the plist to @react-native-firebase/app so prebuild bundles it,
        // then the auth plugin can derive the reCAPTCHA schemes from it.
        config.ios = {
            ...config.ios,
            googleServicesFile: './' + path.relative(projectRoot, plistPath).split(path.sep).join('/'),
        };
    }

    return withInfoPlist(config, (cfg) => {
        const plistPath = findPlist(cfg.modRequest.projectRoot);
        if (!plistPath) {
            console.warn(
                '[withFirebasePhoneAuth] No GoogleService-Info.plist found. iOS phone sign-in will fail with ' +
                    'auth/missing-client-identifier until the Firebase iOS config file is added to the project.'
            );
            return cfg;
        }

        const xml = fs.readFileSync(plistPath, 'utf8');
        const appId = plistString(xml, 'GOOGLE_APP_ID');
        const reversedClientId = plistString(xml, 'REVERSED_CLIENT_ID');

        const schemes = [];
        if (appId) schemes.push(`app-${appId.replace(/:/g, '-')}`);
        if (reversedClientId) schemes.push(reversedClientId);
        if (schemes.length === 0) {
            console.warn('[withFirebasePhoneAuth] GoogleService-Info.plist has no GOOGLE_APP_ID; skipping URL schemes.');
            return cfg;
        }

        const existing = Array.isArray(cfg.modResults.CFBundleURLTypes) ? cfg.modResults.CFBundleURLTypes : [];
        const registered = new Set(existing.flatMap((type) => type.CFBundleURLSchemes ?? []));
        const missing = schemes.filter((scheme) => !registered.has(scheme));

        if (missing.length > 0) {
            cfg.modResults.CFBundleURLTypes = [...existing, { CFBundleURLSchemes: missing }];
        }
        return cfg;
    });
};
