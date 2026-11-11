import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PickedDocument } from '@/src/lib/documents';
import { captureDocumentPhoto, pickDocumentFile, pickDocumentFromGallery } from '@/src/lib/documents';
import { colors } from '@/src/theme/colors';

type DocumentUploadProps = {
    file: PickedDocument | null;
    uploading?: boolean;
    onPick: (file: PickedDocument | null) => void;
};

export function DocumentUpload({ file, uploading, onPick }: DocumentUploadProps) {
    const choose = async (picker: () => Promise<PickedDocument | null>) => {
        if (uploading) return;
        const picked = await picker();
        if (picked) onPick(picked);
    };

    return (
        <View style={styles.wrap}>
            {file ? (
                <View style={styles.selected}>
                    <Text style={styles.selectedTitle}>Document selected</Text>
                    <Text numberOfLines={2} style={styles.selectedName}>{file.name}</Text>
                    <Pressable onPress={() => onPick(null)} hitSlop={8}>
                        <Text style={styles.changeText}>Choose a different file</Text>
                    </Pressable>
                </View>
            ) : null}

            {uploading ? (
                <View style={styles.busy}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.busyText}>Uploading document…</Text>
                </View>
            ) : (
                <>
                    <Pressable style={styles.primary} onPress={() => void choose(captureDocumentPhoto)}>
                        <Text style={styles.primaryText}>Take photo of document</Text>
                    </Pressable>
                    <Pressable style={styles.secondary} onPress={() => void choose(pickDocumentFromGallery)}>
                        <Text style={styles.secondaryText}>Choose photo from gallery</Text>
                    </Pressable>
                    <Pressable style={styles.secondary} onPress={() => void choose(pickDocumentFile)}>
                        <Text style={styles.secondaryText}>Choose PDF or image file</Text>
                    </Pressable>
                    <Text style={styles.hint}>PDF, JPG, or PNG · Max 10MB</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 10 },
    selected: {
        borderWidth: 1,
        borderColor: '#86EFAC',
        backgroundColor: '#F0FDF4',
        borderRadius: 14,
        padding: 12,
    },
    selectedTitle: { fontSize: 12, fontWeight: '800', color: '#166534' },
    selectedName: { marginTop: 4, fontSize: 14, color: colors.text },
    changeText: { marginTop: 8, color: colors.primary, fontSize: 13, fontWeight: '700' },
    busy: { alignItems: 'center', paddingVertical: 12, gap: 8 },
    busyText: { color: colors.textMuted, fontSize: 13 },
    primary: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    secondary: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 14,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    secondaryText: { color: colors.text, fontWeight: '700', fontSize: 14 },
    hint: { textAlign: 'center', fontSize: 12, color: colors.textMuted },
});
