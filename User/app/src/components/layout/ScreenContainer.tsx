import { View, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  scrollProps?: ScrollViewProps;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenContainer({ children, scroll = true, padded = true, scrollProps, edges = ['top'] }: Props) {
  const inner = padded ? <View className="px-5 pb-6">{children}</View> : children;
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-surface">
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} {...scrollProps}>
          {inner}
        </ScrollView>
      ) : (
        <View className="flex-1">{inner}</View>
      )}
    </SafeAreaView>
  );
}
