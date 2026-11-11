/** Expo config — release shrinking enabled via expo-build-properties. */
const base = require('./app.json').expo;

const buildPropertiesPlugin = [
    'expo-build-properties',
    {
        ios: { deploymentTarget: '16.4' },
        android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            extraProguardRules: [
                '-keepattributes *Annotation*',
                '-keepattributes JavascriptInterface',
                '-dontwarn com.razorpay.**',
                '-keep class com.razorpay.** { *; }',
                '-optimizations !method/inlining/',
                '-keepclasseswithmembers class * { public void onPayment*(...); }',
            ].join('\n'),
        },
    },
];

const pluginsWithoutBuildProps = base.plugins.filter(
    (plugin) => !(Array.isArray(plugin) && plugin[0] === 'expo-build-properties')
);

const firebasePlugins = ['@react-native-firebase/app', '@react-native-firebase/auth'];

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
    expo: {
        ...base,
        plugins: [...pluginsWithoutBuildProps, ...firebasePlugins, buildPropertiesPlugin],
    },
};
