import { useCallback, useLayoutEffect, useState } from 'react';

export interface FloatingStyle {
  top: number;
  left: number;
  width: number;
  maxHeight?: number;
}

const GAP = 6;
const VIEWPORT_PAD = 8;

export function useFloatingStyle(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  opts?: {
    minWidth?: number;
    preferWidth?: 'anchor' | 'content';
    maxPanelHeight?: number;
    /** Não limita altura — só posiciona acima/abaixo pelo tamanho natural */
    fitContent?: boolean;
    contentHeight?: number;
  }
) {
  const [style, setStyle] = useState<FloatingStyle | null>(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fitContent = Boolean(opts?.fitContent);
    const contentHeight = opts?.contentHeight ?? opts?.maxPanelHeight ?? 280;
    const maxPanelHeight = opts?.maxPanelHeight ?? 280;

    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
    const spaceAbove = rect.top - VIEWPORT_PAD;
    const needed = fitContent ? contentHeight : Math.min(maxPanelHeight, 180);
    const placeBelow = spaceBelow >= needed || spaceBelow >= spaceAbove;

    let width = opts?.preferWidth === 'content' ? Math.max(rect.width, opts.minWidth ?? 0) : rect.width;
    if (opts?.minWidth) width = Math.max(width, opts.minWidth);

    let left = rect.left;
    if (left + width > window.innerWidth - VIEWPORT_PAD) {
      left = Math.max(VIEWPORT_PAD, window.innerWidth - VIEWPORT_PAD - width);
    }
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;

    if (fitContent) {
      const top = placeBelow
        ? rect.bottom + GAP
        : Math.max(VIEWPORT_PAD, rect.top - GAP - contentHeight);
      setStyle({ top, left, width });
      return;
    }

    const maxHeight = Math.max(140, Math.min(maxPanelHeight, placeBelow ? spaceBelow - GAP : spaceAbove - GAP));
    const top = placeBelow
      ? rect.bottom + GAP
      : Math.max(VIEWPORT_PAD, rect.top - GAP - maxHeight);

    setStyle({ top, left, width, maxHeight });
  }, [
    anchorRef,
    opts?.contentHeight,
    opts?.fitContent,
    opts?.maxPanelHeight,
    opts?.minWidth,
    opts?.preferWidth,
  ]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return style;
}

export function isInsideFloating(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[data-ui-floating]'));
}
