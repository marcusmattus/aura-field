import { type ReactNode } from 'react';
import { Text, View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';

/** A mono uppercase eyebrow / telemetry label. */
export function Mono({
  children,
  className,
  size = 10,
  style,
}: {
  children: ReactNode;
  className?: string;
  size?: number;
  style?: object;
}) {
  return (
    <Text
      className={cn('text-mute font-mono', className)}
      style={[{ fontSize: size, letterSpacing: 1.4 }, style]}
    >
      {children}
    </Text>
  );
}

/** Outfit display title. */
export function Display({
  children,
  className,
  size = 26,
  color = '#e9ecf5',
}: {
  children: ReactNode;
  className?: string;
  size?: number;
  color?: string;
}) {
  return (
    <Text
      className={cn(className)}
      style={{ fontFamily: 'Outfit_600SemiBold', fontSize: size, color }}
    >
      {children}
    </Text>
  );
}

/** Lora italic — the user's own voice only. */
export function Voice({
  children,
  className,
  size = 15,
}: {
  children: ReactNode;
  className?: string;
  size?: number;
}) {
  return (
    <Text
      className={cn('text-ink', className)}
      style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: size, lineHeight: size * 1.5 }}
    >
      {children}
    </Text>
  );
}

/** A bordered panel surface. */
export function Panel({ className, style, ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('bg-panel border-line rounded-2xl border', className)}
      style={style}
      {...rest}
    />
  );
}

/** A mono chip. */
export function Chip({
  label,
  color = '#8a90a6',
  filled = false,
}: {
  label: string;
  color?: string;
  filled?: boolean;
}) {
  return (
    <View
      className="rounded-md border px-2 py-1"
      style={{
        borderColor: filled ? color : `${color}55`,
        backgroundColor: filled ? `${color}22` : 'transparent',
      }}
    >
      <Text className="font-mono" style={{ fontSize: 9, letterSpacing: 1.2, color }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
