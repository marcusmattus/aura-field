import { useRouter } from 'expo-router';
import { Download, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel } from '@/components/ui';
import { useChakraStore } from '@/lib/store';
import { useVirtueStore } from '@/lib/virtueStore';

const ACCENT = '#8a90a6';

const COMMITMENTS = [
  'Journal entries and voice transcripts are yours — never sold, never used for advertising.',
  'Camera frames from Mudra Vision and Palm Field are processed on-device and never uploaded or stored.',
  'Nothing you write is used to train any model without your explicit, separate consent.',
  'You can export everything below, or delete your journal at any time.',
];

/** Privacy & data (spec §63-65). Every action here is real: export produces
 * an actual share sheet with your data; delete actually deletes. */
export default function PrivacyScreen() {
  const router = useRouter();
  const entries = useChakraStore((s) => s.entries);
  const sessions = useChakraStore((s) => s.sessions);
  const palmScans = useChakraStore((s) => s.palmScans);
  const deleteEntry = useChakraStore((s) => s.deleteEntry);
  const virtuePractices = useVirtueStore((s) => s.practices);
  const [deleting, setDeleting] = useState(false);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/you');
  };

  const exportData = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      journalEntries: entries,
      sessions,
      palmScans,
      virtuePractices,
    };
    try {
      await Share.share({
        title: 'ChakraOS data export',
        message: JSON.stringify(payload, null, 2),
      });
    } catch {
      // user cancelled the share sheet
    }
  };

  const confirmDeleteJournal = () => {
    if (entries.length === 0) return;
    const run = async () => {
      setDeleting(true);
      for (const e of entries) {
        // eslint-disable-next-line no-await-in-loop -- deleting sequentially avoids racing the same store update
        await deleteEntry(e.id);
      }
      setDeleting(false);
    };
    if (Platform.OS === 'web') {
      void run();
      return;
    }
    Alert.alert(
      'Delete all journal entries?',
      `This permanently deletes ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} from this device and the cloud. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete all', style: 'destructive', onPress: () => void run() },
      ],
    );
  };

  return (
    <View className="bg-field flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="pt-safe-offset-4 px-5">
          <View className="flex-row items-start justify-between">
            <Mono>PRIVACY</Mono>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <X color="#8a90a6" size={20} />
            </Pressable>
          </View>
          <Display size={26} className="mt-1.5">
            Privacy & data
          </Display>

          <View className="mt-4 gap-2.5">
            {COMMITMENTS.map((c) => (
              <Panel key={c} className="p-3.5">
                <Text className="text-mute" style={{ fontSize: 12.5, lineHeight: 18 }}>
                  {c}
                </Text>
              </Panel>
            ))}
          </View>

          <Mono className="mt-6 mb-2">YOUR DATA</Mono>
          <Pressable onPress={() => void exportData()} accessibilityRole="button">
            <Panel className="flex-row items-center gap-3 p-4">
              <Download color={ACCENT} size={16} />
              <View className="flex-1">
                <Text className="text-ink" style={{ fontSize: 13 }}>
                  Export my data
                </Text>
                <Text className="text-faint mt-0.5" style={{ fontSize: 10.5 }}>
                  {entries.length} journal entries · {sessions.length} sessions · {palmScans.length} palm scans
                </Text>
              </View>
            </Panel>
          </Pressable>

          <Pressable onPress={confirmDeleteJournal} disabled={deleting || entries.length === 0} className="mt-2.5" accessibilityRole="button">
            <Panel className="flex-row items-center gap-3 p-4" style={entries.length === 0 ? { opacity: 0.5 } : undefined}>
              <Trash2 color="#ff6b6b" size={16} />
              <Text className="flex-1" style={{ fontSize: 13, color: '#ff6b6b' }}>
                {deleting ? 'Deleting…' : 'Delete all journal entries'}
              </Text>
            </Panel>
          </Pressable>

          <Text className="text-faint mt-6" style={{ fontSize: 10, lineHeight: 15 }}>
            Deleting your journal does not delete your account. To delete your account entirely,
            contact support from the email tied to your account.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
