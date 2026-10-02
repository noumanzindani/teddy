import { TextInput, TextInputProps, View, Text } from 'react-native';
import { forwardRef } from 'react';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, Props>(({ label, error, hint, className = '', ...rest }, ref) => {
  return (
    <View className="w-full">
      {label && <Text className="text-sm font-medium text-ink-soft mb-1.5">{label}</Text>}
      <TextInput
        ref={ref}
        placeholderTextColor="#9A9A91"
        className={`bg-surface-card rounded-lg px-4 py-3 text-base text-ink border ${error ? 'border-danger' : 'border-sage-200'} ${className}`}
        {...rest}
      />
      {error ? (
        <Text className="text-xs text-danger mt-1">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-ink-muted mt-1">{hint}</Text>
      ) : null}
    </View>
  );
});
Input.displayName = 'Input';
