import { Dimensions, StyleSheet, Text, View } from "react-native";
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Sortable from "react-native-sortables";

const DATA: [string, string[]][] = [
  ["🇺🇸", ["New York", "Los Angeles", "Chicago"]],
  ["🇫🇷", ["Paris", "Lyon", "Marseille"]],
  ["🇯🇵", ["Tokyo", "Osaka", "Kyoto"]],
  ["🇬🇧", ["London", "Manchester", "Birmingham"]],
  ["🇩🇪", ["Berlin", "Munich", "Hamburg"]],
  ["🇮🇹", ["Rome", "Milan", "Naples"]],
  ["🇪🇸", ["Madrid", "Barcelona", "Valencia"]],
  ["🇨🇦", ["Toronto", "Vancouver", "Montreal"]],
  ["🇦🇺", ["Sydney", "Melbourne", "Brisbane"]],
  ["🇧🇷", ["São Paulo", "Rio de Janeiro", "Salvador"]],
  ["🇲🇽", ["Mexico City", "Guadalajara", "Monterrey"]],
  ["🇮🇳", ["Mumbai", "Delhi", "Bangalore"]],
  ["🇰🇷", ["Seoul", "Busan", "Incheon"]],
  ["🇳🇱", ["Amsterdam", "Rotterdam", "The Hague"]],
  ["🇸🇪", ["Stockholm", "Gothenburg", "Malmö"]],
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
              strategy="insert"
            >
              {DATA.map(([country, cities]) => (
                <>
                  <Marker key={`marker${country}`} label={country} />
                  {cities.map((city) => (
                    <Item key={`item${city}`} label={city} />
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

const Item = ({ label }: { label: string }) => {
  return (
    <View style={[styles.element, styles.item]}>
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

const ELEMENT_HEIGHT = 100;
const GAP_SIZE = 12;
const MARKER_WIDTH = GAP_SIZE * 3;

const ITEM_WIDTH =
  (Dimensions.get("window").width - GAP_SIZE * 5 - MARKER_WIDTH) / 3;

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
  item: { backgroundColor: "#86b7aF", width: ITEM_WIDTH },
  marker: { backgroundColor: "#bababa", width: MARKER_WIDTH },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: GAP_SIZE,
  },
});
