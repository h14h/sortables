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
    const { indexToKey, keyToIndex, itemHeights, itemWidths } =
      // biome-ignore lint/correctness/useHookAtTopLevel: Needed for higher order function
      useCommonValuesContext();

    return ({ activeIndex, activeKey, position }) => {
      "worklet";

      const currentIndexToKey = indexToKey.get();
      const currentKeyToIndex = keyToIndex.get();
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
        currentKeyToIndex,
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
        shouldSwapItem(
          activeIndex,
          currentIndexToKey,
          currentKeyToIndex,
          currentItemWidths,
          offset.x,
          direction.x,
        )
      ) {
        return getSwappedItem(activeIndex, currentIndexToKey, direction.x);
      }

      if (
        isMarker(activeKey) &&
        shouldSwapRow(
          activeIndex,
          currentIndexToKey,
          currentKeyToIndex,
          currentItemHeights,
          offset.y,
          direction.y,
        )
      ) {
        return getSwappedRow(
          activeIndex,
          currentIndexToKey,
          currentKeyToIndex,
          direction.y,
        );
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
export const getItemKey = (itemID: string, markerID: string) =>
  `${getMarkerKey(markerID)}:${itemID}`;

export const isMarkerForItem = (markerKey: string, markerID: string) => {
  "worklet";
  return isMarker(markerKey) && markerKey.includes(markerID);
};

export const isItemOfMarker = (itemKey: string, markerKey: string) => {
  "worklet";
  return isItem(itemKey) && itemKey.includes(markerKey.substring(2));
};

const getSiblingItemKeys = (index: number, indexToKey: string[]) => {
  "worklet";

  const siblings = [];

  const inBounds = (i: number) => i >= 0 && i < indexToKey.length;

  for (let i = index + LEFT; inBounds(i); i += LEFT) {
    if (isMarker(indexToKey[i])) break;
    siblings.push(indexToKey[i]);
  }

  for (let i = index + RIGHT; inBounds(i); i += RIGHT) {
    if (isMarker(indexToKey[i])) break;
    siblings.push(indexToKey[i]);
  }

  return siblings;
};

const getSiblingMarkerKeys = (index: number, indexToKey: string[]) => {
  "worklet";

  const siblings = [];

  const inBounds = (i: number) => i >= 0 && i < indexToKey.length;

  for (let i = index + UP; inBounds(i); i += UP) {
    if (isMarker(indexToKey[i])) siblings.push(indexToKey[i]);
  }

  for (let i = index + DOWN; inBounds(i); i += DOWN) {
    if (isMarker(indexToKey[i])) siblings.push(indexToKey[i]);
  }

  return siblings;
};

const getOriginX = (
  itemKey: string,
  itemIndex: number,
  indexToKey: string[],
  keyToIndex: Record<string, number>,
  itemWidths: Record<string, number>,
): number => {
  "worklet";

  if (isMarker(itemKey)) return PADDING_SIZE + MARKER_WIDTH / 2;

  const currentItemWidth = itemWidths[itemKey];

  const siblingItemKeys = getSiblingItemKeys(itemIndex, indexToKey);
  const prevSiblingItemKeys = siblingItemKeys.filter(
    (key) => keyToIndex[key] < itemIndex,
  );

  const prevSiblingItemKeysCount = prevSiblingItemKeys.length;
  const prevSiblingItemKeysWidths = prevSiblingItemKeys.map(
    (key) => itemWidths[key],
  );

  const prevSiblingItemsWidth = prevSiblingItemKeysWidths.reduce(
    (sum, width) => sum + width,
    0,
  );

  return (
    PADDING_SIZE + // Left Padding
    MARKER_WIDTH + // Width of row marker
    GAP_SIZE + // Gap after row marker
    GAP_SIZE * prevSiblingItemKeysCount + // Gap after each left sibling
    prevSiblingItemsWidth + // Total width of the left siblings
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

const shouldSwapItem = (
  itemIndex: number,
  indexToKey: string[],
  keyToIndex: Record<string, number>,
  itemWidths: Record<string, number>,
  offsetX: OffsetX,
  direction: DirectionX,
): boolean => {
  "worklet";

  const siblingWidth = itemWidths[indexToKey[itemIndex + direction]];
  const swapThreshold = GAP_SIZE + siblingWidth;

  const isPastThreshold = Math.abs(offsetX) > swapThreshold;
  if (!isPastThreshold) return false;

  const siblingItemKeys = getSiblingItemKeys(itemIndex, indexToKey);
  const leftSiblingItemKeys = siblingItemKeys.filter(
    (key) => keyToIndex[key] < itemIndex,
  );
  const rightSiblingItemKeys = siblingItemKeys.filter(
    (key) => keyToIndex[key] > itemIndex,
  );

  return (
    (direction === LEFT && leftSiblingItemKeys.length > 0) ||
    (direction === RIGHT && rightSiblingItemKeys.length > 0)
  );
};

const shouldSwapRow = (
  markerIndex: number,
  indexToKey: string[],
  keyToIndex: Record<string, number>,
  itemHeights: Record<string, number>,
  offsetY: OffsetY,
  direction: DirectionY,
): boolean => {
  "worklet";

  const siblingHeight = itemHeights[indexToKey[markerIndex + direction]];
  const swapThreshold = GAP_SIZE + siblingHeight;

  const isPastThreshold = Math.abs(offsetY) > swapThreshold;
  if (!isPastThreshold) return false;

  const siblingMarkerKeys = getSiblingMarkerKeys(markerIndex, indexToKey);

  const upSiblingMarkerKeys = siblingMarkerKeys.filter(
    (key) => keyToIndex[key] < markerIndex,
  );

  if (direction === UP && upSiblingMarkerKeys.length === 0) return false;

  const downSiblingMarkerKeys = siblingMarkerKeys.filter(
    (key) => keyToIndex[key] > markerIndex,
  );

  if (direction === DOWN && downSiblingMarkerKeys.length === 0) return false;

  return true;
};

const getSwappedItem = (
  index: number,
  indexToKey: string[],
  direction: DirectionX,
): string[] => {
  "worklet";

  const newIndexToKey = [...indexToKey];

  newIndexToKey[index + direction] = indexToKey[index];
  newIndexToKey[index] = indexToKey[index + direction];

  return newIndexToKey;
};

const getRowForMarker = (markerIndex: number, indexToKey: string[]) => {
  "worklet";

  const markerKey = indexToKey[markerIndex];
  return indexToKey.filter(
    (key) => key === markerKey || isItemOfMarker(key, markerKey),
  );
};

const getSwappedRow = (
  activeMarkerIndex: number,
  indexToKey: string[],
  keyToIndex: Record<string, number>,
  direction: DirectionY,
): string[] => {
  "worklet";

  const markerIndexes = indexToKey
    .filter(isMarker)
    .map((key) => keyToIndex[key]);

  const targetMarkerIndex =
    markerIndexes[markerIndexes.indexOf(activeMarkerIndex) + direction];

  const activeRow = getRowForMarker(activeMarkerIndex, indexToKey);
  const targetRow = getRowForMarker(targetMarkerIndex, indexToKey);

  const newIndexToKey = [...indexToKey];

  const swapDown = (
    startIndex: number,
    upperRow: string[],
    lowerRow: string[],
  ) => {
    newIndexToKey.splice(startIndex, lowerRow.length, ...lowerRow);
    newIndexToKey.splice(
      startIndex + lowerRow.length,
      upperRow.length,
      ...upperRow,
    );
  };

  if (direction === UP) {
    swapDown(targetMarkerIndex, targetRow, activeRow);
  }

  if (direction === DOWN) {
    swapDown(activeMarkerIndex, activeRow, targetRow);
  }

  return newIndexToKey;
};
