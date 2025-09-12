import { Text, View, StyleSheet, ScrollView, } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Sortable, { SortStrategyFactory } from 'react-native-sortables';

const DATA = [
  'Poland',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Portugal',
  'Greece',
  'Great Britain',
  'United States',
  'Canada',
  'Australia',
  'New Zealand'
];

const customFlexStrategy: SortStrategyFactory = () => (params) => {
  console.log(JSON.stringify(params, null, 2))

  return []
}

export default function Flex() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView>
        <SafeAreaView>
          <ScrollView contentContainerStyle={styles.container} style={styles.container}>
            <Sortable.Flex gap={16} padding={8} alignItems="center" width="fill" strategy={customFlexStrategy}>
              {DATA.map(item => (
                <View style={styles.cell} key={item}>
                  <Text style={styles.text}>{item}</Text>
                </View>
              ))}
            </Sortable.Flex>
          </ScrollView>
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%"
  },
  cell: {
    backgroundColor: '#86b7aF',
    borderRadius: 9999,
    margin: "auto",
    height: 96,
    minWidth: 128,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    fontSize: 16,
    fontWeight: "bold"
  }
});
