import { useState } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { colors, radius, spacing } from '@/src/theme/colors';

export interface AddressDraft {
    label?: string;
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    postal_code: string;
}

export const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
    'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry',
];

export function emptyAddress(fullName = '', phone = ''): AddressDraft {
    return {
        label: 'home',
        full_name: fullName,
        phone,
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
    };
}

export function validateAddress(address: AddressDraft): string | null {
    if (!address.full_name.trim()) return 'Enter the name of the person receiving the order.';
    if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\D/g, ''))) return 'Enter a valid 10-digit mobile number.';
    if (!address.address_line1.trim()) return 'Enter the house, flat, or building name.';
    if (!address.city.trim()) return 'Enter the city or town.';
    if (!address.state.trim()) return 'Select the state.';
    if (!/^\d{6}$/.test(address.postal_code.replace(/\D/g, ''))) return 'Enter a valid 6-digit PIN code.';
    return null;
}

export function AddressForm({
    value,
    onChange,
    compact,
}: {
    value: AddressDraft;
    onChange: (next: AddressDraft) => void;
    compact?: boolean;
}) {
    const [statePickerOpen, setStatePickerOpen] = useState(false);

    const field = (key: keyof AddressDraft, label: string, placeholder: string, options?: {
        keyboardType?: 'default' | 'number-pad';
        maxLength?: number;
        autoCapitalize?: 'none' | 'characters' | 'words';
        optional?: boolean;
    }) => (
        <View style={styles.field}>
            <Text style={styles.label}>
                {label}
                {options?.optional ? <Text style={styles.optional}> · optional</Text> : null}
            </Text>
            <TextInput
                style={styles.input}
                value={String(value[key] ?? '')}
                onChangeText={(text) =>
                    onChange({
                        ...value,
                        [key]:
                            key === 'phone' || key === 'postal_code'
                                ? text.replace(/\D/g, '').slice(0, options?.maxLength)
                                : text,
                    })
                }
                placeholder={placeholder}
                placeholderTextColor={colors.textFaint}
                keyboardType={options?.keyboardType ?? 'default'}
                maxLength={options?.maxLength}
                autoCapitalize={options?.autoCapitalize ?? 'words'}
            />
        </View>
    );

    return (
        <View style={styles.wrap}>
            {field('full_name', 'Full name', 'Name of the person receiving the order')}
            {field('phone', 'Mobile number', '10-digit mobile number', {
                keyboardType: 'number-pad',
                maxLength: 10,
                autoCapitalize: 'none',
            })}
            {field('address_line1', 'House / flat / building', 'Flat no., floor, building or house name')}
            {field('address_line2', 'Area / landmark', 'Street, locality, or nearby landmark', {
                optional: true,
            })}

            <View style={compact ? undefined : styles.row}>
                <View style={styles.rowItem}>
                    {field('city', 'City / town', 'For example, Patna')}
                </View>
                <View style={styles.rowItem}>
                    <Text style={styles.label}>State</Text>
                    <Pressable style={styles.input} onPress={() => setStatePickerOpen(true)}>
                        <Text style={[styles.pickerValue, !value.state && styles.pickerPlaceholder]}>
                            {value.state || 'Select state'}
                        </Text>
                    </Pressable>
                </View>
            </View>

            {field('postal_code', 'PIN code', '6-digit PIN code', {
                keyboardType: 'number-pad',
                maxLength: 6,
                autoCapitalize: 'none',
            })}

            <Modal visible={statePickerOpen} transparent animationType="slide" onRequestClose={() => setStatePickerOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setStatePickerOpen(false)}>
                    <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Select state</Text>
                            <Pressable onPress={() => setStatePickerOpen(false)} hitSlop={10}>
                                <Text style={styles.close}>Close</Text>
                            </Pressable>
                        </View>
                        <FlatList
                            data={INDIAN_STATES}
                            keyExtractor={(item) => item}
                            style={styles.stateList}
                            renderItem={({ item }) => (
                                <Pressable
                                    style={styles.stateRow}
                                    onPress={() => {
                                        onChange({ ...value, state: item });
                                        setStatePickerOpen(false);
                                    }}
                                >
                                    <Text style={[styles.stateText, value.state === item && styles.stateActive]}>
                                        {item}
                                    </Text>
                                    {value.state === item ? <Text style={styles.check}>✓</Text> : null}
                                </Pressable>
                            )}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 12 },
    field: { gap: 6 },
    label: { fontSize: 12.5, fontWeight: '700', color: colors.text },
    optional: { fontWeight: '500', color: colors.textFaint },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: colors.text,
        backgroundColor: '#FFFCFE',
        justifyContent: 'center',
        minHeight: 48,
    },
    row: { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1, gap: 6 },
    pickerValue: { fontSize: 15, color: colors.text },
    pickerPlaceholder: { color: colors.textFaint },
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '72%',
        paddingBottom: spacing.xl,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    close: { color: colors.primary, fontWeight: '700' },
    stateList: { paddingHorizontal: spacing.xl },
    stateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    stateText: { fontSize: 15, color: colors.text },
    stateActive: { color: colors.primary, fontWeight: '700' },
    check: { color: colors.primary, fontWeight: '800' },
});
