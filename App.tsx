import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Sortable from "react-native-sortables";
import {
  customFlexStrategy,
  ELEMENT_HEIGHT,
  GAP_SIZE,
  getItemWidth,
  MARKER_WIDTH,
} from "./strategy";

const DATA: [string, string[]][] = [
  ["🇺🇸", ["New York", "Los Angeles", "Chicago"]],
  ["🇫🇷", ["Paris", "Nice"]],
  ["🇯🇵", ["Tokyo"]],
  ["🇬🇧", ["London", "Manchester", "Birmingham"]],
  ["🇩🇪", ["Berlin", "Munich"]],
  ["🇮🇹", ["Rome"]],
  ["🇪🇸", ["Madrid", "Barcelona"]],
  ["🇨🇦", ["Toronto", "Vancouver", "Montreal"]],
  ["🇦🇺", ["Sydney", "Melbourne", "Brisbane"]],
  ["🇧🇷", ["São Paulo", "Salvador"]],
  ["🇲🇽", ["Mexico City"]],
  ["🇮🇳", ["Mumbai", "Delhi"]],
  ["🇰🇷", ["Seoul", "Busan", "Incheon"]],
  ["🇳🇱", ["Amsterdam"]],
  ["🇸🇪", ["Stockholm", "Gothenburg"]],
];

export default function Flex() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView>
        <SafeAreaView>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.container}
          >
            <Sortable.Flex
              gap={GAP_SIZE}
              padding={GAP_SIZE}
              alignItems="center"
              width="fill"
              strategy={customFlexStrategy}
            >
              {DATA.map(([country, cities]) => (
                <>
                  <Marker key={`marker${country}`} label={country} />
                  {cities.map((city) => (
                    <Item
                      key={`item${city}`}
                      label={city}
                      width={getItemWidth(cities.length)}
                    />
                  ))}
                </>
              ))}
            </Sortable.Flex>
          </ScrollView>
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const Item = ({ label, width }: { label: string; width: number }) => {
  return (
    <View style={[styles.element, styles.item, { width }]}>
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </View>
  );
};

const Marker = ({ label }: { label: string }) => {
  return (
    <View style={[styles.element, styles.marker]}>
      <Text>{label}</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  element: {
    borderRadius: GAP_SIZE,
    margin: "auto",
    height: ELEMENT_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  item: { backgroundColor: "#86b7aF" },
  marker: { backgroundColor: "#bababa", width: MARKER_WIDTH },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: GAP_SIZE,
  },
});
