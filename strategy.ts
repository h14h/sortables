import { Dimensions } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import {
  type SortStrategyFactory,
  useCommonValuesContext,
} from "react-native-sortables";
import { scheduleOnRN } from "react-native-worklets";

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

type DragOutHandlerArgs = {
  markerID: string;
  elementID: string;
  rowIndex: number;
  direction: DirectionY;
};

type CustomFlexStrategyArgs = {
  activeItemOffset: SharedValue<Offset>;
  onDragOut: (args: DragOutHandlerArgs) => void;
};

type CustomFlexStrategyFactoryFactory = (
  args: CustomFlexStrategyArgs,
) => SortStrategyFactory;

export const useCustomFlexStrategy: CustomFlexStrategyFactoryFactory = ({
  activeItemOffset,
  onDragOut,
}) => {
  return () => {
    // biome-ignore lint/correctness/useHookAtTopLevel: Needed for higher order function
    const commonValues = useCommonValuesContext();

    const { indexToKey, keyToIndex, itemHeights, itemWidths } = commonValues;

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
        isElement(activeKey) &&
        shouldSwapElement(
          activeIndex,
          currentIndexToKey,
          currentKeyToIndex,
          currentItemWidths,
          offset.x,
          direction.x,
        )
      ) {
        return getSwappedElement(activeIndex, currentIndexToKey, direction.x);
      }

      if (
        isElement(activeKey) &&
        shouldExitRow(
          activeIndex,
          currentIndexToKey,
          currentKeyToIndex,
          currentItemHeights,
          offset.y,
          direction.y,
        )
      ) {
        const markers = currentIndexToKey.filter(isMarker);
        const elementMarkerIndex = getAdjacentMarkerIndex(
          activeIndex,
          currentIndexToKey,
          LEFT,
        );

        const elementKey = currentIndexToKey[activeIndex];
        const markerKey = currentIndexToKey[elementMarkerIndex];

        const rowIndex = markers.indexOf(markerKey);

        const markerID = getMarkerID(markerKey);
        const elementID = getElementID(elementKey);

        scheduleOnRN(onDragOut, {
          markerID,
          elementID,
          rowIndex,
          direction: direction.y,
        });
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

const MAX_ELEMENTS = 3;
export const getElementWidth = (elementCount: number) => {
  if (elementCount < 0)
    console.error("There cannot be negative Elements in a Row");

  if (elementCount === 0)
    console.error("There must be at least one Element in a Row");

  if (elementCount > MAX_ELEMENTS)
    console.error(`There cannot be more than ${MAX_ELEMENTS} in a Row`);

  return (
    (Dimensions.get("window").width -
      MARKER_WIDTH -
      PADDING_SIZE * 2 -
      GAP_SIZE * elementCount) /
    elementCount
  );
};

const MARKER_PREFIX = ".$";
const ELEMENT_PREFIX = ".1:$";

export const isMarker = (key: string) => {
  "worklet";
  return key.startsWith(MARKER_PREFIX);
};

const isElement = (key: string) => {
  "worklet";
  return key.startsWith(ELEMENT_PREFIX);
};

const CHILD_SEPARATOR = "_";

export const getMarkerKey = (markerID: string) => markerID;
export const getElementKey = (elementID: string, markerID: string) =>
  getMarkerKey(markerID) + CHILD_SEPARATOR + elementID;

const getMarkerID = (markerInternalKey: string) => {
  "worklet";

  const [_reactPrefix, markerExternalKey] = markerInternalKey.split("$");

  return markerExternalKey;
};

const getElementID = (elementInternalKey: string) => {
  "worklet";

  const [_reactPrefix, elementExternalKey] = elementInternalKey.split("$");
  const [_markerID, elementID] = elementExternalKey.split(CHILD_SEPARATOR);

  return elementID;
};

export const isMarkerForElement = (
  internalMarkerKey: string,
  markerID: string,
) => {
  "worklet";
  return (
    isMarker(internalMarkerKey) &&
    internalMarkerKey === MARKER_PREFIX + markerID
  );
};

export const isElementOfMarker = (
  internalElementKey: string,
  internalMarkerKey: string,
) => {
  "worklet";
  const elementID = getElementID(internalElementKey);
  const markerID = getMarkerID(internalMarkerKey);

  return (
    isElement(internalElementKey) &&
    internalElementKey ===
      ELEMENT_PREFIX + markerID + CHILD_SEPARATOR + elementID
  );
};

const getAdjacentMarkerIndex = (
  itemIndex: number,
  indexToKey: string[],
  direction: DirectionX | DirectionY,
) => {
  "worklet";
  const isBounded = (i: number) => i >= 0 && i < indexToKey.length;
  for (let i = itemIndex + direction; isBounded(i); i += direction) {
    if (isMarker(indexToKey[i])) return i;
  }

  return -1; // TODO: Should never happen
};

const getSiblingElementKeys = (index: number, indexToKey: string[]) => {
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

  const currentElementWidth = itemWidths[itemKey];

  const siblingElementKeys = getSiblingElementKeys(itemIndex, indexToKey);
  const prevSiblingElementKeys = siblingElementKeys.filter(
    (key) => keyToIndex[key] < itemIndex,
  );

  const prevSiblingElementKeysCount = prevSiblingElementKeys.length;
  const prevSiblingElementKeysWidths = prevSiblingElementKeys.map(
    (key) => itemWidths[key],
  );

  const prevSiblingElementTotalWidth = prevSiblingElementKeysWidths.reduce(
    (sum, width) => sum + width,
    0,
  );

  return (
    PADDING_SIZE + // Left Padding
    MARKER_WIDTH + // Width of row marker
    GAP_SIZE + // Gap after row marker
    GAP_SIZE * prevSiblingElementKeysCount + // Gap after each left sibling
    prevSiblingElementTotalWidth + // Total width of the left siblings
    currentElementWidth / 2 // Distance to center of dragged element
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

const shouldSwapElement = (
  elementIndex: number,
  indexToKey: string[],
  keyToIndex: Record<string, number>,
  itemWidths: Record<string, number>,
  offsetX: OffsetX,
  direction: DirectionX,
): boolean => {
  "worklet";

  const siblingWidth = itemWidths[indexToKey[elementIndex + direction]];
  const swapThreshold = GAP_SIZE + siblingWidth;

  const isPastThreshold = Math.abs(offsetX) > swapThreshold;
  if (!isPastThreshold) return false;

  const siblingElementKeys = getSiblingElementKeys(elementIndex, indexToKey);
  const leftSiblingElementKeys = siblingElementKeys.filter(
    (key) => keyToIndex[key] < elementIndex,
  );
  const rightSiblingElementKeys = siblingElementKeys.filter(
    (key) => keyToIndex[key] > elementIndex,
  );

  return (
    (direction === LEFT && leftSiblingElementKeys.length > 0) ||
    (direction === RIGHT && rightSiblingElementKeys.length > 0)
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

  const markerHeight = itemHeights[indexToKey[markerIndex]];
  const swapThreshold = GAP_SIZE + markerHeight;

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

const getSwappedElement = (
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
    (key) => key === markerKey || isElementOfMarker(key, markerKey),
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

const shouldExitRow = (
  elementIndex: number,
  indexToKey: string[],
  keyToIndex: Record<string, number>,
  itemHeights: Record<string, number>,
  offsetY: OffsetY,
  direction: DirectionY,
): boolean => {
  "worklet";

  const itemHeight = itemHeights[indexToKey[elementIndex]];
  const swapThreshold = itemHeight / 2;

  const isPastThreshold = Math.abs(offsetY) > swapThreshold;
  if (!isPastThreshold) return false;

  const markerIndex = (() => {
    for (let i = elementIndex - 1; i >= 0; i--) {
      if (isMarker(indexToKey[i])) return i;
    }

    return -1; // TODO: Should never happen
  })();

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

function moveElement(
  activeIndex: number,
  currentIndexToKey: string[],
  direction: DirectionY,
) {
  "worklet";
  const newIndexToKey = [...currentIndexToKey];

  const prevMarkerIndex = (() => {
    for (let i = activeIndex - 1; i >= 0; i--) {
      if (isMarker(currentIndexToKey[i])) return i;
    }

    return -1; // TODO: Should never happen
  })();

  const nextMarkerIndex = (() => {
    for (let i = activeIndex + 1; i < currentIndexToKey.length; i++) {
      if (isMarker(currentIndexToKey[i])) return i;
    }

    return -1; // TODO: Should never happen
  })();

  if (direction === UP) {
    newIndexToKey.splice(activeIndex, 1);
    newIndexToKey.splice(prevMarkerIndex, 0, currentIndexToKey[activeIndex]);
  }

  if (direction === DOWN) {
    newIndexToKey.splice(
      nextMarkerIndex - 1,
      0,
      currentIndexToKey[activeIndex],
    );
    newIndexToKey.splice(activeIndex, 1);
  }

  return newIndexToKey;
}
