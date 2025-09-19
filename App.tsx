import { ScrollView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Sortable, {
  DragActivationState,
  useCommonValuesContext,
  useItemContext,
} from "react-native-sortables";
import type { Vector } from "react-native-sortables/dist/typescript/types";
import {
  ELEMENT_HEIGHT,
  GAP_SIZE,
  getItemKey,
  getItemWidth,
  getMarkerKey,
  isMarkerForItem,
  MARKER_WIDTH,
  useCustomFlexStrategy,
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
  const zeroOffset = { x: 0, y: 0 };
  const activeItemOffset = useSharedValue(zeroOffset);
  const customFlexStrategy = useCustomFlexStrategy(activeItemOffset);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView>
        <SafeAreaView>
          <ScrollView
            style={[styles.container]}
            contentContainerStyle={styles.container}
          >
            <Sortable.Flex
              gap={GAP_SIZE}
              padding={GAP_SIZE}
              alignItems="center"
              width="fill"
              strategy={customFlexStrategy}
              onDragEnd={() => activeItemOffset.set(zeroOffset)}
              activeItemOpacity={0.8}
            >
              {DATA.map(([country, cities]) => (
                <>
                  <Marker key={getMarkerKey(country)} label={country} />
                  {cities.map((city) => (
                    <Item
                      key={getItemKey(city, country)}
                      markerID={country}
                      label={city}
                      width={getItemWidth(cities.length)}
                      activeItemOffset={activeItemOffset}
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

type ItemProps = {
  label: string;
  width: number;
  markerID: string;
  activeItemOffset: SharedValue<Vector>;
};

function Item({ label, markerID, width, activeItemOffset }: ItemProps) {
  const { activeItemKey, activationState, prevActiveItemKey } =
    useItemContext();

  const { activeAnimationProgress } = useCommonValuesContext();

  const markerActivationState = useDerivedValue<DragActivationState>(() => {
    const currentActiveItemKey = activeItemKey.get();

    return markerID &&
      currentActiveItemKey !== null &&
      isMarkerForItem(currentActiveItemKey, markerID)
      ? activationState.value
      : DragActivationState.INACTIVE;
  });

  const isMarkerActive = useDerivedValue<boolean>(
    () => markerActivationState.get() === DragActivationState.ACTIVE,
  );

  const isMarkerPreviouslyActive = useDerivedValue<boolean>(() => {
    const currentPrevActiveItemKey = prevActiveItemKey.get();

    return (
      !!markerID &&
      currentPrevActiveItemKey !== null &&
      isMarkerForItem(currentPrevActiveItemKey, markerID)
    );
  });

  const markerAnimationProgress = useDerivedValue(() => {
    if (isMarkerActive.get() || isMarkerPreviouslyActive.get()) {
      return activeAnimationProgress.get();
    }

    return 0;
  });

  const markerOffset = useDerivedValue(() => {
    if (isMarkerActive.get() || isMarkerPreviouslyActive.get()) {
      return activeItemOffset.get();
    }

    return { x: 0, y: 0 };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const progress = markerAnimationProgress.get();
    const currentMarkerOffset = markerOffset.get();

    return {
      transform: [
        {
          translateX: interpolate(progress, [0, 1], [0, currentMarkerOffset.x]),
        },
        {
          translateY: interpolate(progress, [0, 1], [0, currentMarkerOffset.y]),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.item, styles.element, { width }, animatedStyle]}
    >
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </Animated.View>
  );
}

const Marker = ({ label }: { label: string }) => {
  return (
    <View style={[styles.item, styles.marker]}>
      <Text>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  item: {
    borderRadius: GAP_SIZE,
    margin: "auto",
    height: ELEMENT_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  element: { backgroundColor: "#86b7aF" },
  marker: { backgroundColor: "#bababa", width: MARKER_WIDTH },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: GAP_SIZE,
  },
});
