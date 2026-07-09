/**
 * AUTH SETTINGS — Authentication status and logout functionality
 */

import { useRouter } from 'expo-router';
import { LogOut, User, Wifi, WifiOff, Settings, Shield } from 'lucide-react-native';
import { Pressable, View, Alert } from 'react-native';
import { Text } from 'heroui-native';

import { Mono, Panel } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { useChakraStore } from '@/lib/store';

const ACCENT = SURFACE_ACCENT.you;
const SUCCESS = '#36F5A6';
const WARNING = '#FFD23D';
const ERROR = '#FF4D5E';

export function AuthSettings() {
  const router = useRouter();
  const profile = useChakraStore(s => s.profile);
  
  const {
    user,
    isAuthenticated,
    hasBackend,
    isOfflineMode,
    signOut
  } = useEnhancedAuth();
  
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You\'ll need to sign in again to access your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out completely. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  if (!isAuthenticated) {
    return (
      <Panel className="p-4">
        <View className="flex-row items-center gap-3 mb-2">
          <Shield color={WARNING} size={16} />
          <Mono style={{ color: WARNING }}>NOT AUTHENTICATED</Mono>
        </View>
        <Text className="text-mute" style={{ fontSize: 13, fontFamily: 'Inter_400Regular' }}>
          Sign in to sync your data and access all features.
        </Text>
        <Pressable
          className="mt-3 flex-row items-center justify-center gap-2 rounded-full py-3"
          style={{ backgroundColor: ACCENT }}
          onPress={() => router.push('/auth')}
        >
          <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
            SIGN IN
          </Text>
        </Pressable>
      </Panel>
    );
  }

  return (
    <View className="gap-3">
      {/* User Info */}
      <Panel className="p-4">
        <View className="flex-row items-center gap-3 mb-2">
          <User color={SUCCESS} size={16} />
          <Mono style={{ color: SUCCESS }}>AUTHENTICATED</Mono>
        </View>
        
        <View className="gap-2">
          <View className="flex-row justify-between items-center">
            <Text className="text-mute" style={{ fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              Email
            </Text>
            <Text className="text-ink" style={{ fontSize: 12, fontFamily: 'Inter_500Medium' }}>
              {user?.email}
            </Text>
          </View>
          
          {profile?.displayName && (
            <View className="flex-row justify-between items-center">
              <Text className="text-mute" style={{ fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                Name
              </Text>
              <Text className="text-ink" style={{ fontSize: 12, fontFamily: 'Inter_500Medium' }}>
                {profile.displayName}
              </Text>
            </View>
          )}
          
          <View className="flex-row justify-between items-center">
            <Text className="text-mute" style={{ fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              Mode
            </Text>
            <View className="flex-row items-center gap-2">
              {isOfflineMode ? (
                <WifiOff color={WARNING} size={12} />
              ) : (
                <Wifi color={SUCCESS} size={12} />
              )}
              <Text 
                className="font-mono" 
                style={{ 
                  fontSize: 10, 
                  color: isOfflineMode ? WARNING : SUCCESS 
                }}
              >
                {isOfflineMode ? 'OFFLINE' : 'ONLINE'}
              </Text>
            </View>
          </View>
          
          {user?.isOffline && (
            <View className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#2A1810' }}>
              <Text style={{ color: WARNING, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                Local test account - data stays on this device only
              </Text>
            </View>
          )}
        </View>
      </Panel>

      {/* Actions */}
      <Panel className="p-4">
        <Mono className="mb-3" style={{ fontSize: 12 }}>ACCOUNT ACTIONS</Mono>
        
        <View className="gap-2">
          <Pressable
            className="flex-row items-center justify-between p-3 rounded-xl"
            style={{ backgroundColor: '#1a1f2e' }}
            onPress={() => router.push('/profile-setup')}
          >
            <View className="flex-row items-center gap-3">
              <Settings color="#8a90a6" size={16} />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#e9ecf5' }}>
                Edit Profile
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: '#8a90a6' }}>›</Text>
          </Pressable>
          
          <Pressable
            className="flex-row items-center justify-between p-3 rounded-xl"
            style={{ backgroundColor: '#2d1b1b' }}
            onPress={handleSignOut}
          >
            <View className="flex-row items-center gap-3">
              <LogOut color={ERROR} size={16} />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: ERROR }}>
                Sign Out
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: ERROR }}>›</Text>
          </Pressable>
        </View>
      </Panel>

      {/* Development Info */}
      {__DEV__ && (
        <Panel className="p-4">
          <Mono className="mb-2" style={{ fontSize: 10, color: '#666' }}>
            DEVELOPMENT INFO
          </Mono>
          <View className="gap-1">
            <Text style={{ fontSize: 10, fontFamily: 'JetBrainsMono_400Regular', color: '#666' }}>
              User ID: {user?.id.substring(0, 20)}...
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'JetBrainsMono_400Regular', color: '#666' }}>
              Backend: {hasBackend ? 'Connected' : 'Not configured'}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'JetBrainsMono_400Regular', color: '#666' }}>
              Mode: {isOfflineMode ? 'Offline' : 'Online'}
            </Text>
          </View>
        </Panel>
      )}
    </View>
  );
}