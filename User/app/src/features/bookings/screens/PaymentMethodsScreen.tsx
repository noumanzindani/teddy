import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { GradientButton, ConfirmPopup, EmptyState } from '@components/primitives';
import { CreditCardVisual } from '../components/CreditCardVisual';

export function PaymentMethodsScreen() {
  const nav = useNavigation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasCard, setHasCard] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-5 pt-4 pb-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
          <ChevronLeft size={26} color="#1B1B16" />
        </Pressable>
        <Text className="text-2xl font-bold text-ink">Payment Methods</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {hasCard ? (
          <CreditCardVisual
            number="4000  1234  5678  9012"
            validThru="01/30"
            cvv="123"
            holder="Cardholder"
            onEdit={() => (nav as any).navigate('EditCard', { cardId: 'c1' })}
            onDelete={() => setConfirmDelete(true)}
          />
        ) : (
          <EmptyState
            title="No saved cards"
            description="Add a card to speed up your checkout."
          />
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-surface">
        <GradientButton label="Add New Card" onPress={() => (nav as any).navigate('AddNewCard')} />
      </View>

      <ConfirmPopup
        visible={confirmDelete}
        title="Are You Sure?"
        body="Are you sure? You want to delete this card?"
        confirmLabel="No"
        cancelLabel="Yes"
        onConfirm={() => setConfirmDelete(false)}
        onCancel={() => {
          setConfirmDelete(false);
          setHasCard(false);
        }}
      />
    </SafeAreaView>
  );
}
