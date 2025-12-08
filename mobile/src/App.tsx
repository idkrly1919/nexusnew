import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './contexts/AuthContext';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { AuthScreen } from './screens/AuthScreen';
import { ChatScreen } from './screens/ChatScreen';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { PaperProvider } from 'react-native-paper';

const Stack = createStackNavigator();

const App = () => {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <PaperProvider>
          <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#111827" />
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen 
                  name="Auth" 
                  component={AuthScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="Chat" 
                  component={ChatScreen}
                  options={{ headerShown: false }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaView>
        </PaperProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
});

export default App;