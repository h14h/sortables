import { useRef, useState } from "react";
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
  getElementKey,
  getElementWidth,
  getMarkerKey,
  isMarkerForElement,
  MARKER_WIDTH,
  useCustomFlexStrategy,
} from "./strategy";

export class Country {
  private static nextId = 1;
  public readonly id: null | string;
  public cities: City[] = [];

  constructor(
    public name: string,
    public pendingID?: string,
  ) {
    if (pendingID) {
      this.id = null;
    } else {
      this.id = Country.nextId.toString();
      Country.nextId++;
    }
  }

  addCity(city: City) {
    this.cities.push(city);
  }

  addAndCreateCity(cityName: string) {
    this.cities.push(new City(cityName));
  }

  addAndCreateCities(cityNames: string[]) {
    this.cities.push(...cityNames.map((name) => new City(name)));
  }

  dropCity(cityId: string) {
    const cityIndex = this.cities.findIndex((city) => city.id === cityId);
    if (cityIndex === -1) return null;

    const city = this.cities[cityIndex];
    this.cities.splice(cityIndex, 1);
    return city;
  }

  getID() {
    return this.id
      ? this.id.toString()
      : this.pendingID
        ? `PENDING_${this.pendingID}`
        : "NULL";
  }
}

export class City {
  private static nextId = 1;
  public readonly id: string;

  constructor(public name: string) {
    City.nextId++;
    this.id = City.nextId.toString();
  }
}

const usa = new Country("🇺🇸");
usa.addAndCreateCities(["New York", "Los Angeles", "Chicago"]);

const france = new Country("🇫🇷");
france.addAndCreateCities(["Paris", "Nice"]);

const japan = new Country("🇯🇵");
japan.addAndCreateCity("Tokyo");

const uk = new Country("🇬🇧");
uk.addAndCreateCities(["London", "Manchester", "Birmingham"]);

const germany = new Country("🇩🇪");
germany.addAndCreateCities(["Berlin", "Munich"]);

const italy = new Country("🇮🇹");
italy.addAndCreateCity("Rome");

const spain = new Country("🇪🇸");
spain.addAndCreateCities(["Madrid", "Barcelona"]);

const canada = new Country("🇨🇦");
canada.addAndCreateCities(["Toronto", "Vancouver", "Montreal"]);

const australia = new Country("🇦🇺");
australia.addAndCreateCities(["Sydney", "Melbourne", "Brisbane"]);

const brazil = new Country("🇧🇷");
brazil.addAndCreateCities(["São Paulo", "Salvador"]);

const mexico = new Country("🇲🇽");
mexico.addAndCreateCity("Mexico City");

const india = new Country("🇮🇳");
india.addAndCreateCities(["Mumbai", "Delhi"]);

const southKorea = new Country("🇰🇷");
southKorea.addAndCreateCities(["Seoul", "Busan", "Incheon"]);

const netherlands = new Country("🇳🇱");
netherlands.addAndCreateCity("Amsterdam");

const sweden = new Country("🇸🇪");
sweden.addAndCreateCities(["Stockholm", "Gothenburg"]);

const DATA = [
  usa,
  france,
  japan,
  uk,
  germany,
  italy,
  spain,
  canada,
  australia,
  brazil,
  mexico,
  india,
  southKorea,
  netherlands,
  sweden,
];

export default function Flex() {
  const [countries, setCountries] = useState(DATA);

  const zeroOffset = { x: 0, y: 0 };
  const activeItemOffset = useSharedValue(zeroOffset);

  const newCountryID = useRef(0);

  const customFlexStrategy = useCustomFlexStrategy({
    activeItemOffset,
    onDragOut: ({ elementID, rowIndex, direction }) => {
      const prevCountry = countries[rowIndex];

      const newCountry = new Country(
        prevCountry.name,
        newCountryID.current.toString(),
      );

      newCountryID.current = newCountryID.current + 1;

      // Insert new row at next index if moving down, current index if moving up
      const targetIndex = direction === 1 ? rowIndex + 1 : rowIndex;

      setCountries((countries) => {
        const city = prevCountry.dropCity(elementID);

        if (city === null) return countries;

        newCountry.addCity(city);

        return [
          ...countries.slice(0, targetIndex),
          newCountry,
          ...countries.slice(targetIndex),
        ];
      });
    },
  });

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
              {countries.map((country) => (
                <>
                  <Marker
                    key={getMarkerKey(country.getID())}
                    label={country.name}
                  />
                  {country.cities.map((city) => (
                    <Item
                      key={getElementKey(city.id.toString(), country.getID())}
                      markerID={country.getID()}
                      markerLabel={country.name}
                      label={city.name}
                      width={getElementWidth(country.cities.length)}
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
  markerLabel: string;
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
      isMarkerForElement(currentActiveItemKey, markerID)
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
      isMarkerForElement(currentPrevActiveItemKey, markerID)
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
