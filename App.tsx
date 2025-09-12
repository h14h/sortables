import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Sortable, {
  type SortStrategyFactory,
  useCommonValuesContext,
} from "react-native-sortables";

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

const customFlexStrategy: SortStrategyFactory = () => {
  const {
    activeItemKey: _activeItemKey,
    indexToKey,
    itemHeights: _itemHeights,
    itemWidths: _itemWidths,
    keyToIndex,
  } = useCommonValuesContext();

  console.log("keyToIndex", JSON.stringify(keyToIndex, null, 2));

  return ({ activeIndex: i, activeKey: key, dimensions, position }) => {
    "worklet";
    const w = Math.trunc(dimensions.width);
    const h = Math.trunc(dimensions.height);
    const x = Math.trunc(position.x);
    const y = Math.trunc(position.y);

    console.log(`[${i}]${key} ${w}x${h}@${x},${y}`);

    return indexToKey.value;
  };
};

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
