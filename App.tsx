import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Sortable, {
  type SortStrategyFactory,
  useCommonValuesContext,
} from "react-native-sortables";
import type { ItemSizes } from "react-native-sortables/dist/typescript/types";

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

const ELEMENT_HEIGHT = 100;
const GAP_SIZE = 12;
const MARKER_WIDTH = GAP_SIZE * 3;

const ITEM_WIDTH =
  (Dimensions.get("window").width - GAP_SIZE * 5 - MARKER_WIDTH) / 3;

const MARKER_PREFIX = ".$";
const ITEM_PREFIX = ".1:$";

const isMarker = (key: string) => {
  "worklet";
  return key.startsWith(MARKER_PREFIX);
};

const isItem = (key: string) => {
  "worklet";
  return key.startsWith(ITEM_PREFIX);
};

type Left = -1;
type Right = 1;

type Direction = Left | Right;

const LEFT: Left = -1;
const RIGHT: Right = 1;

const getSiblingKeys = (
  index: number,
  indexToKey: string[],
  direction: Direction,
) => {
  "worklet";

  const siblings = [];

  for (let i = index + direction; i >= 0; i += direction) {
    if (indexToKey[i].startsWith(".$marker")) break;
    siblings.push(indexToKey[i]);
  }

  return siblings;
};

const getOriginX = (
  itemKey: string,
  itemIndex: number,
  indexToKey: string[],
  itemWidths: Record<string, number>,
): number => {
  "worklet";

  if (isMarker(itemKey)) return GAP_SIZE; // Left Padding

  const currentItemWidth = itemWidths[itemKey];

  const siblingKeys = getSiblingKeys(itemIndex, indexToKey, LEFT);

  const siblingCount = siblingKeys.length;
  const siblingWidths = siblingKeys.map((key) => itemWidths[key]);

  const siblingsWidth = siblingWidths.reduce((sum, width) => sum + width, 0);

  return (
    GAP_SIZE + // Left Padding
    MARKER_WIDTH + // Width of row marker
    GAP_SIZE + // Gap after row marker
    GAP_SIZE * siblingCount + // Gap after each left sibling
    siblingsWidth + // Total width of the left siblings
    currentItemWidth / 2 // Distance to center of dragged item
  );
};

const getSiblings = (
  index: number,
  indexToKey: string[],
  direction: Left | Right,
) => {
  "worklet";

  const siblings = [];

  const inBounds = (i: number) => i >= 0 && i < indexToKey.length;
  for (let i = index + direction; inBounds(i); i += direction) {
    if (indexToKey[i].startsWith(".$marker")) break;
    siblings.push(indexToKey[i]);
  }

  return siblings;
};

const customFlexStrategy: SortStrategyFactory = () => {
  const { indexToKey, itemWidths } = useCommonValuesContext();

  return ({ activeIndex, activeKey, position }) => {
    "worklet";

    const currentIndexToKey = indexToKey.get();

    const currentItemWidths: ItemSizes = itemWidths.get();
    if (!currentItemWidths) return currentIndexToKey;
    if (typeof currentItemWidths === "number") return currentIndexToKey;

    const originX = getOriginX(
      activeKey,
      activeIndex,
      currentIndexToKey,
      currentItemWidths,
    );

    const offset = {
      x: position.x - originX,
    };

    const direction = {
      x: offset.x >= 0 ? RIGHT : LEFT,
    };

    const shouldSwap = (offsetX: number, direction: Left | Right): boolean => {
      const siblingWidth =
        currentItemWidths[currentIndexToKey[activeIndex + direction]];
      const swapThreshold = GAP_SIZE + siblingWidth;

      const isPastThreshold = Math.abs(offsetX) > swapThreshold;
      if (!isPastThreshold) return false;

      return getSiblings(activeIndex, currentIndexToKey, direction).length > 0;
    };

    const getSwapped = (direction: Left | Right): string[] => {
      const newIndexToKey = [...currentIndexToKey];

      newIndexToKey[activeIndex + direction] = currentIndexToKey[activeIndex];
      newIndexToKey[activeIndex] = currentIndexToKey[activeIndex + direction];

      return newIndexToKey;
    };

    if (isItem(activeKey) && shouldSwap(offset.x, direction.x)) {
      return getSwapped(direction.x);
    }

    return currentIndexToKey;
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
