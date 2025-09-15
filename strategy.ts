import { Dimensions } from "react-native";
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

export const customFlexStrategy: SortStrategyFactory = () => {
  const { indexToKey, itemWidths } = useCommonValuesContext();

  return ({ activeIndex, activeKey, position }) => {
    "worklet";

    const currentIndexToKey = indexToKey.get();
    const currentItemWidths = itemWidths.get();

    if (!currentItemWidths) return currentIndexToKey;
    if (typeof currentItemWidths === "number") return currentIndexToKey;

    const originX = getOriginX(
      activeKey,
      activeIndex,
      currentIndexToKey,
      currentItemWidths,
    );

    const offset: Offset = {
      x: position.x - originX,
      y: 0, // TODO
    };

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

export const ELEMENT_HEIGHT = 100;
export const GAP_SIZE = 12;
export const MARKER_WIDTH = GAP_SIZE * 3;

export const ITEM_WIDTH =
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

const getSiblingKeys = (
  index: number,
  indexToKey: string[],
  direction: DirectionX,
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

  return getSiblings(index, indexToKey, direction).length > 0;
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
