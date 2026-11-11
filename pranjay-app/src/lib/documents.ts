import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export type PickedDocument = {
    uri: string;
    name: string;
    mimeType: string;
};

const DOC_TYPES = [
    { id: 'gst', label: 'GST' },
    { id: 'pan', label: 'PAN' },
    { id: 'aadhaar', label: 'Aadhaar' },
    { id: 'voter_id', label: 'Voter ID' },
    { id: 'shop_license', label: 'Shop license' },
    { id: 'msme', label: 'MSME' },
    { id: 'shop_establishment', label: 'Shop & Est.' },
    { id: 'udyog_aadhar', label: 'Udyam' },
] as const;

export const KYC_DOCUMENT_TYPES = DOC_TYPES;

function normalizeMime(name: string, mime?: string | null): string {
    const raw = (mime || '').toLowerCase();
    if (raw === 'image/jpg' || raw === 'image/jpeg' || name.toLowerCase().endsWith('.jpg') || name.toLowerCase().endsWith('.jpeg')) {
        return 'image/jpeg';
    }
    if (raw === 'image/png' || name.toLowerCase().endsWith('.png')) return 'image/png';
    if (raw === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'application/pdf';
    if (raw.startsWith('image/')) return 'image/jpeg';
    return raw || 'image/jpeg';
}

function fileName(prefix: string, mime: string): string {
    if (mime === 'application/pdf') return `${prefix}.pdf`;
    if (mime === 'image/png') return `${prefix}.png`;
    return `${prefix}.jpg`;
}

async function askSettings(title: string, message: string): Promise<void> {
    await new Promise<void>((resolve) => {
        Alert.alert(title, message, [
            { text: 'Not now', style: 'cancel', onPress: () => resolve() },
            { text: 'Open Settings', onPress: () => { void Linking.openSettings(); resolve(); } },
        ]);
    });
}

async function ensureAndroidPermission(permission: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS]): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function captureDocumentPhoto(): Promise<PickedDocument | null> {
    try {
        const androidOk = await ensureAndroidPermission(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (!androidOk) {
            await askSettings(
                'Camera permission needed',
                'Allow camera access for Pranjay in your phone settings, then take the photo again.'
            );
            return null;
        }

        const current = await ImagePicker.getCameraPermissionsAsync();
        const permission = current.granted ? current : await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            await askSettings(
                'Camera permission needed',
                'Allow camera access for Pranjay in your phone settings, then take the photo again.'
            );
            return null;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: false,
            cameraType: ImagePicker.CameraType.back,
        });
        if (result.canceled || !result.assets[0]) return null;

        const asset = result.assets[0];
        const mimeType = normalizeMime(asset.fileName || 'document.jpg', asset.mimeType || 'image/jpeg');
        return {
            uri: asset.uri,
            name: fileName(`document-${Date.now()}`, mimeType),
            mimeType,
        };
    } catch {
        await askSettings(
            'Camera could not open',
            'Allow camera access for Pranjay in Settings. You can also choose a photo from your gallery or a PDF.'
        );
        return null;
    }
}

export async function pickDocumentFromGallery(): Promise<PickedDocument | null> {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    const permission = current.granted ? current : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        await askSettings(
            'Photos permission needed',
            'Allow photo access so you can choose a document image from your gallery.'
        );
        return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    const mimeType = normalizeMime(asset.fileName || 'gallery.jpg', asset.mimeType);
    return {
        uri: asset.uri,
        name: fileName(`gallery-${Date.now()}`, mimeType),
        mimeType,
    };
}

export async function pickDocumentFile(): Promise<PickedDocument | null> {
    const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
        multiple: false,
    });
    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    const mimeType = normalizeMime(asset.name, asset.mimeType);
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(mimeType)) {
        Alert.alert('Unsupported file', 'Please choose a PDF, JPG, or PNG (max 10MB).');
        return null;
    }
    if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose a file under 10MB.');
        return null;
    }
    return { uri: asset.uri, name: asset.name, mimeType };
}
