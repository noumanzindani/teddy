import { View, Text } from 'react-native';
import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <View className="items-center justify-center py-12 px-8">
      {icon && <View className="mb-4 opacity-60">{icon}</View>}
      <Text className="text-lg font-semibold text-ink text-center">{title}</Text>
      {description && <Text className="text-sm text-ink-muted text-center mt-2">{description}</Text>}
      {action && <View className="mt-6">{action}</View>}
    </View>
  );
}
