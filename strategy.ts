import { Dimensions } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
  type SortStrategyFactory,
  useCommonValuesContext,
} from "react-native-sortables";

type OffsetX = number;
type OffsetY = number;

type Offset = {
  x: OffsetX;
  y: OffsetY;
};

type Left = -1;
type Right = 1;
type Up = -1;
type Down = 1;

const LEFT: Left = -1;
const RIGHT: Right = 1;
const UP: Up = -1;
const DOWN: Down = 1;

type DirectionX = Left | Right;
type DirectionY = Up | Down;

type Direction = {
  x: DirectionX;
  y: DirectionY;
};

export const useCustomFlexStrategy: (
  activeItemOffset: SharedValue<Offset>,
) => SortStrategyFactory = (activeItemOffset) => {
  return () => {
    // biome-ignore lint/correctness/useHookAtTopLevel: Needed for higher order function
    const { indexToKey, itemHeights, itemWidths } = useCommonValuesContext();

    return ({ activeIndex, activeKey, position }) => {
      "worklet";

      const currentIndexToKey = indexToKey.get();
      const currentItemWidths = itemWidths.get();
      const currentItemHeights = itemHeights.get();

      if (!currentItemWidths) return currentIndexToKey;
      if (typeof currentItemWidths === "number") return currentIndexToKey;

      if (!currentItemHeights) return currentIndexToKey;
      if (typeof currentItemHeights === "number") return currentIndexToKey;

      const originX = getOriginX(
        activeKey,
        activeIndex,
        currentIndexToKey,
        currentItemWidths,
      );

      const originY = getOriginY(
        activeIndex,
        currentIndexToKey,
        currentItemHeights,
      );

      const offset: Offset = {
        x: position.x - originX,
        y: position.y - originY,
      };

      activeItemOffset.set(offset);

      const direction: Direction = {
        x: offset.x >= 0 ? RIGHT : LEFT,
        y: offset.y >= 0 ? DOWN : UP,
      };

      if (
        isItem(activeKey) &&
        shouldSwap(
          activeIndex,
          currentIndexToKey,
          currentItemWidths,
          offset.x,
          direction.x,
        )
      ) {
        return getSwapped(activeIndex, currentIndexToKey, direction.x);
      }

      return currentIndexToKey;
    };
  };
};

export const ELEMENT_HEIGHT = 100;
export const GAP_SIZE = 12;
export const PADDING_SIZE = GAP_SIZE;
export const MARKER_WIDTH = GAP_SIZE * 3;

const MAX_ITEMS = 3;
export const getItemWidth = (itemCount: number) => {
  if (itemCount < 0) console.error("There cannot be negative Items in a Row");

  if (itemCount === 0)
    console.error("There must be at least one Item in a Row");

  if (itemCount > MAX_ITEMS)
    console.error(`There cannot be more than ${MAX_ITEMS} in a Row`);

  return (
    (Dimensions.get("window").width -
      MARKER_WIDTH -
      PADDING_SIZE * 2 -
      GAP_SIZE * itemCount) /
    itemCount
  );
};

const MARKER_PREFIX = ".$";
const ITEM_PREFIX = ".1:$";

export const isMarker = (key: string) => {
  "worklet";
  return key.startsWith(MARKER_PREFIX);
};

const isItem = (key: string) => {
  "worklet";
  return key.startsWith(ITEM_PREFIX);
};

export const getMarkerKey = (markerID: string) => markerID;
export const getItemKey = (markerID: string, itemID: string) =>
  `${getMarkerKey(markerID)}:${itemID}`;

export const isItemMarker = (itemKey: string, markerKey: string) => {
  "worklet";
  return isMarker(itemKey) && itemKey.includes(markerKey);
};

const getSiblingKeys = (
  index: number,
  indexToKey: string[],
  direction: Left | Right,
) => {
  "worklet";

  const siblings = [];

  const inBounds = (i: number) => i >= 0 && i < indexToKey.length;
  for (let i = index + direction; inBounds(i); i += direction) {
    if (isMarker(indexToKey[i])) break;
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

  if (isMarker(itemKey)) return PADDING_SIZE + MARKER_WIDTH / 2;

  const currentItemWidth = itemWidths[itemKey];

  const siblingKeys = getSiblingKeys(itemIndex, indexToKey, LEFT);

  const siblingCount = siblingKeys.length;
  const siblingWidths = siblingKeys.map((key) => itemWidths[key]);

  const siblingsWidth = siblingWidths.reduce((sum, width) => sum + width, 0);

  return (
    PADDING_SIZE + // Left Padding
    MARKER_WIDTH + // Width of row marker
    GAP_SIZE + // Gap after row marker
    GAP_SIZE * siblingCount + // Gap after each left sibling
    siblingsWidth + // Total width of the left siblings
    currentItemWidth / 2 // Distance to center of dragged item
  );
};

const getOriginY = (
  itemIndex: number,
  indexToKey: string[],
  itemHeights: Record<string, number>,
): number => {
  "worklet";

  const currentItemHeight = itemHeights[indexToKey[itemIndex]];

  const precedingMarkerKeys = indexToKey
    .slice(0, itemIndex + 1)
    .filter(isMarker)
    .slice(0, -1);

  const precedingRowCount = precedingMarkerKeys.length;
  const totalPrecedingRowHeight = precedingMarkerKeys
    .map((key) => itemHeights[key])
    .reduce((sum, height) => sum + height, 0);

  // NOTE: This assumes every element in a row is the same height
  return (
    PADDING_SIZE + // Top Padding
    GAP_SIZE * precedingRowCount + // Gap after each row
    totalPrecedingRowHeight + // Total height of the preceding rows
    currentItemHeight / 2 //  Distance to center of dragged item
  );
};

const shouldSwap = (
  index: number,
  indexToKey: string[],
  itemWidths: Record<string, number>,
  offsetX: OffsetX,
  direction: DirectionX,
): boolean => {
  "worklet";

  const siblingWidth = itemWidths[indexToKey[index + direction]];
  const swapThreshold = GAP_SIZE + siblingWidth;

  const isPastThreshold = Math.abs(offsetX) > swapThreshold;
  if (!isPastThreshold) return false;

  return getSiblingKeys(index, indexToKey, direction).length > 0;
};

const getSwapped = (
  index: number,
  indexToKey: string[],
  direction: Left | Right,
): string[] => {
  "worklet";

  const newIndexToKey = [...indexToKey];

  newIndexToKey[index + direction] = indexToKey[index];
  newIndexToKey[index] = indexToKey[index + direction];

  return newIndexToKey;
};
