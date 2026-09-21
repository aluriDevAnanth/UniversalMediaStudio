import { useState, useEffect, useRef, useCallback } from "react";

export const CARD_MIN_WIDTH = 210;
export const CARD_HEIGHT = 240;
export const GAP = 12;
export const OVERSCAN = 2;

export function getColumnCount(width: number): number {
  if (width <= 0) return 1;
  const count = Math.floor((width + GAP) / (CARD_MIN_WIDTH + GAP));
  return Math.max(1, count);
}

export interface VirtualGridState {
  startRow: number;
  endRow: number;
  totalRows: number;
  columnCount: number;
  paddingTop: number;
  paddingBottom: number;
  visibleRange: { start: number; end: number };
}

export function useVirtualGrid(
  containerRef: React.RefObject<HTMLDivElement | null>,
  itemCount: number,
): VirtualGridState {
  const [state, setState] = useState<VirtualGridState>({
    startRow: 0,
    endRow: 0,
    totalRows: 0,
    columnCount: 6,
    paddingTop: 0,
    paddingBottom: 0,
    visibleRange: { start: 0, end: 0 },
  });

  const rafRef = useRef<number | null>(null);
  const colCountRef = useRef(4);

  const compute = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const cols = colCountRef.current;
    const totalRows = Math.ceil(itemCount / cols);
    const rowHeight = CARD_HEIGHT + GAP;
    const scrollTop = el.scrollTop;
    const viewHeight = el.clientHeight;

    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    const lastVisibleRow = Math.ceil((scrollTop + viewHeight) / rowHeight);

    const startRow = Math.max(0, firstVisibleRow - OVERSCAN);
    const endRow = Math.min(totalRows - 1, lastVisibleRow + OVERSCAN);

    const paddingTop = startRow * rowHeight;
    const paddingBottom = Math.max(0, (totalRows - endRow - 1) * rowHeight);

    const visibleStart = startRow * cols;
    const visibleEnd = Math.min(itemCount, (endRow + 1) * cols);

    setState({
      startRow,
      endRow,
      totalRows,
      columnCount: cols,
      paddingTop,
      paddingBottom,
      visibleRange: { start: visibleStart, end: visibleEnd },
    });
  }, [containerRef, itemCount]);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      compute();
      rafRef.current = null;
    });
  }, [compute]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      colCountRef.current = getColumnCount(width);
      compute();
    });

    ro.observe(el);
    colCountRef.current = getColumnCount(el.clientWidth);
    compute();

    return () => ro.disconnect();
  }, [containerRef, compute]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [containerRef, handleScroll]);

  useEffect(() => {
    compute();
  }, [itemCount, compute]);

  return state;
}
