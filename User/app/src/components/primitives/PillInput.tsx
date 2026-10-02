import { TextInput, TextInputProps, View, Text, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import type { ReactNode } from 'react';

interface Props extends TextInputProps {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  isPassword?: boolean;
  error?: string;
}

export const PillInput = forwardRef<TextInput, Props>(
  ({ leftIcon, rightSlot, isPassword, error, ...rest }, ref) => {
    const [hidden, setHidden] = useState(true);
    return (
      <View className="w-full">
        <View
          className={`flex-row items-center bg-surface-input rounded-full px-5 py-3.5 ${
            error ? 'border border-danger' : ''
          }`}
        >
          {leftIcon && <View className="mr-3">{leftIcon}</View>}
          <TextInput
            ref={ref}
            placeholderTextColor="#6B6B62"
            secureTextEntry={isPassword && hidden}
            className="flex-1 text-ink text-base"
            {...rest}
          />
          {isPassword ? (
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
              {hidden ? <Eye size={20} color="#1B1B16" /> : <EyeOff size={20} color="#1B1B16" />}
            </Pressable>
          ) : (
            rightSlot
          )}
        </View>
        {error && <Text className="text-xs text-danger mt-1.5 ml-4">{error}</Text>}
      </View>
    );
  }
);
PillInput.displayName = 'PillInput';
