import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/lib/api';
import type { Address } from '@/src/lib/types';
import { AddressForm, emptyAddress, validateAddress, type AddressDraft } from '@/src/components/AddressForm';
import { EmptyState, PrimaryButton, ScreenHeader } from '@/src/components/ui';
import { useToast } from '@/src/components/Toast';
import { useAuthStore } from '@/src/store/auth';
import { colors, radius, spacing } from '@/src/theme/colors';

export default function AddressesScreen() {
    const { show } = useToast();
    const user = useAuthStore((s) => s.user);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<Address | null>(null);
    const [draft, setDraft] = useState<AddressDraft>(emptyAddress());
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setAddresses(await api.getAddresses());
        } catch (error) {
            show(error instanceof Error ? error.message : 'Could not load addresses', 'error');
        } finally {
            setLoading(false);
        }
    }, [show]);

    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load])
    );

    const openNew = () => {
        setEditing(null);
        setDraft(emptyAddress(user?.full_name ?? '', (user?.phone ?? '').replace(/\D/g, '').slice(-10)));
        setEditorOpen(true);
    };

    const openEdit = (address: Address) => {
        setEditing(address);
        setDraft({
            label: address.label ?? 'home',
            full_name: address.full_name,
            phone: address.phone.replace(/\D/g, '').slice(-10),
            address_line1: address.address_line1,
            address_line2: address.address_line2 ?? '',
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
        });
        setEditorOpen(true);
    };

    const save = async () => {
        const error = validateAddress(draft);
        if (error) {
            show(error, 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                label: draft.label ?? 'home',
                full_name: draft.full_name.trim(),
                phone: `+91${draft.phone}`,
                address_line1: draft.address_line1.trim(),
                address_line2: draft.address_line2.trim() || undefined,
                city: draft.city.trim(),
                state: draft.state,
                postal_code: draft.postal_code,
                country: 'India',
            };
            if (editing) {
                await api.updateAddress(editing.id, payload);
                show('Address updated');
            } else {
                await api.createAddress({ ...payload, is_default: addresses.length === 0 });
                show('Address saved');
            }
            setEditorOpen(false);
            await load();
        } catch (err) {
            show(err instanceof Error ? err.message : 'Could not save address', 'error');
        } finally {
            setSaving(false);
        }
    };

    const makeDefault = async (address: Address) => {
        setBusyId(address.id);
        try {
            await api.updateAddress(address.id, { is_default: true });
            await load();
            show('Default address updated');
        } catch (error) {
            show(error instanceof Error ? error.message : 'Could not update address', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const remove = (address: Address) => {
        Alert.alert('Delete this address?', `${address.full_name} · ${address.address_line1}`, [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setBusyId(address.id);
                    try {
                        await api.deleteAddress(address.id);
                        setAddresses((prev) => prev.filter((item) => item.id !== address.id));
                        show('Address deleted', 'info');
                    } catch (error) {
                        show(error instanceof Error ? error.message : 'Could not delete address', 'error');
                    } finally {
                        setBusyId(null);
                    }
                },
            },
        ]);
    };

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={styles.content}>
                <ScreenHeader
                    title="My addresses"
                    subtitle="Saved delivery addresses for faster checkout"
                />

                {loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
                ) : addresses.length === 0 ? (
                    <EmptyState
                        title="No saved addresses"
                        message="Add your shop or home address to check out in a few taps."
                        actionLabel="Add an address"
                        onAction={openNew}
                    />
                ) : (
                    <View style={styles.list}>
                        {addresses.map((address) => (
                            <View key={address.id} style={styles.card}>
                                <View style={styles.cardTop}>
                                    <View style={styles.cardTitleRow}>
                                        <Text style={styles.name}>{address.full_name}</Text>
                                        {address.is_default ? (
                                            <View style={styles.defaultPill}>
                                                <Text style={styles.defaultText}>Default</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    {busyId === address.id ? (
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    ) : (
                                        <View style={styles.iconActions}>
                                            <Pressable style={styles.iconBtn} onPress={() => openEdit(address)} hitSlop={6}>
                                                <Ionicons name="create-outline" size={17} color={colors.primary} />
                                            </Pressable>
                                            <Pressable style={styles.iconBtn} onPress={() => remove(address)} hitSlop={6}>
                                                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.line}>{address.address_line1}</Text>
                                {address.address_line2 ? <Text style={styles.line}>{address.address_line2}</Text> : null}
                                <Text style={styles.line}>
                                    {address.city}, {address.state} – {address.postal_code}
                                </Text>
                                <Text style={styles.phone}>{address.phone}</Text>
                                {!address.is_default ? (
                                    <Pressable style={styles.setDefault} onPress={() => void makeDefault(address)}>
                                        <Text style={styles.setDefaultText}>Set as default</Text>
                                    </Pressable>
                                ) : null}
                            </View>
                        ))}

                        <PrimaryButton label="Add another address" variant="outline" onPress={openNew} />
                    </View>
                )}
            </ScrollView>

            <Modal visible={editorOpen} animationType="slide" onRequestClose={() => setEditorOpen(false)}>
                <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setEditorOpen(false)} hitSlop={8}>
                            <Text style={styles.cancel}>Cancel</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>{editing ? 'Edit address' : 'New address'}</Text>
                        <View style={{ width: 48 }} />
                    </View>
                    <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                        <AddressForm value={draft} onChange={setDraft} />
                        <View style={styles.modalFooter}>
                            <PrimaryButton label={editing ? 'Save changes' : 'Save address'} onPress={() => void save()} loading={saving} />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 36 },
    list: { paddingHorizontal: spacing.lg, gap: 10 },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 15,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 3,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    name: { fontSize: 14, fontWeight: '800', color: colors.text },
    defaultPill: { backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    defaultText: { fontSize: 9, fontWeight: '800', color: colors.success },
    iconActions: { flexDirection: 'row', gap: 5 },
    iconBtn: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    line: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
    phone: { fontSize: 12.5, fontWeight: '600', color: colors.text, marginTop: 3 },
    setDefault: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 3 },
    setDefaultText: { fontSize: 11.5, fontWeight: '800', color: colors.primary },
    modalRoot: { flex: 1, backgroundColor: colors.bg },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 56 : 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    cancel: { color: colors.textMuted, fontSize: 13.5, fontWeight: '600' },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    modalContent: { padding: spacing.lg, paddingBottom: 40 },
    modalFooter: { marginTop: 20 },
});
