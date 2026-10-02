import { View, Text } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import { Header } from './Header';
import { useNavigation } from '@react-navigation/native';

interface Props {
  title: string;
  notes?: string[];
}

export function PlaceholderScreen({ title, notes }: Props) {
  const nav = useNavigation();
  return (
    <ScreenContainer>
      <Header title={title} showBack onBackPress={() => nav.goBack()} showBell />
      <View className="bg-surface-card rounded-xl p-6 mt-4">
        <Text className="text-base text-ink-soft leading-6">
          🚧 Placeholder for <Text className="font-semibold">{title}</Text>
        </Text>
        <Text className="text-sm text-ink-muted mt-2">
          Phase 0 scaffolding. Real UI wired up in later phases.
        </Text>
        {notes && notes.length > 0 && (
          <View className="mt-4">
            {notes.map((n, i) => (
              <Text key={i} className="text-sm text-ink-muted">• {n}</Text>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
