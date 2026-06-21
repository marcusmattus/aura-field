import { type ReactNode } from 'react';
import { Image, Pressable, Text, View, type ViewProps } from 'react-native';
import Animated, { FadeIn as RNFadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

/** The full chakraOS brand lockup (figure + wordmark + tagline) on its native
 * black field. Width-driven; the artwork is square. */
export function Logo({ width = 240, className }: { width?: number; className?: string }) {
  return (
    <Image
      source={require('@/assets/logo.png')}
      style={{ width, height: width }}
      resizeMode="contain"
      className={className}
      accessibilityLabel="chakraOS"
    />
  );
}

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

/**
 * Subtle entrance for a card or row. Quiet fade + slight rise, staggered by
 * `index`. Renders statically (no animation) when reduce-motion is on.
 */
export function FadeIn({
  children,
  index = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  style?: ViewProps['style'];
}) {
  const reduced = useReducedMotion();
  if (reduced) return <View style={style}>{children}</View>;
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 55)
        .duration(260)
        .springify()
        .damping(18)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/** Gentle opacity-only fade for hero elements. Static under reduce-motion. */
export function SoftFade({ children, style }: { children: ReactNode; style?: ViewProps['style'] }) {
  const reduced = useReducedMotion();
  if (reduced) return <View style={style}>{children}</View>;
  return (
    <Animated.View entering={RNFadeIn.duration(420)} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * Full-surface lock for free-tier gated surfaces (Coach, Sound). Routes to the
 * paywall. Render as a sibling overlay above blurred/dimmed surface content.
 */
export function LockOverlay({
  surface,
  accent,
  title,
  body,
}: {
  surface: string;
  accent: string;
  title: string;
  body: string;
}) {
  const router = useRouter();
  return (
    <View className="bg-field/90 absolute inset-0 z-10 items-center justify-center px-8">
      <View
        className="h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: `${accent}22` }}
      >
        <Lock color={accent} size={26} />
      </View>
      <Mono style={{ color: accent, marginTop: 18 }}>{surface}</Mono>
      <Display size={24} className="mt-2 text-center">
        {title}
      </Display>
      <Text className="text-mute mt-3 text-center" style={{ fontSize: 14, lineHeight: 21 }}>
        {body}
      </Text>
      <Pressable
        className="mt-6 items-center justify-center rounded-full px-8 py-3.5"
        style={{ backgroundColor: accent }}
        onPress={() => router.push('/paywall')}
      >
        <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
          UNLOCK · $30/YR
        </Text>
      </Pressable>
    </View>
  );
}
