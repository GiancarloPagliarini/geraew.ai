'use client';

import { useCallback, useRef, useState } from 'react';

interface DraggablePanelProps {
  id: string;
  position?: { x: number; y: number };
  children: (dragHandleRef: React.RefObject<HTMLDivElement | null>) => React.ReactNode;
}

export function DraggablePanel({
  id: _id,
  position: initialPosition = { x: 200, y: 150 },
  children,
}: DraggablePanelProps) {
  const [position, setPosition] = useState(initialPosition);
  const positionRef = useRef(initialPosition);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPointer = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    isDragging.current = true;
    startPointer.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...positionRef.current };

    if (elementRef.current) {
      elementRef.current.style.zIndex = '1000';
      elementRef.current.style.cursor = 'grabbing';
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDragging.current || !elementRef.current) return;
      const dx = ev.clientX - startPointer.current.x;
      const dy = ev.clientY - startPointer.current.y;
      const newX = startPos.current.x + dx;
      const newY = startPos.current.y + dy;
      positionRef.current = { x: newX, y: newY };
      elementRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
    };

    const onPointerUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (elementRef.current) {
        elementRef.current.style.zIndex = '10';
        elementRef.current.style.cursor = '';
      }
      setPosition({ ...positionRef.current });
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, []);

  // Attach pointer listener to drag handle whenever ref resolves
  const setDragHandle = useCallback(
    (node: HTMLDivElement | null) => {
      (dragHandleRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (node) {
        node.addEventListener('pointerdown', onPointerDown);
      }
    },
    [onPointerDown]
  );

  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      (elementRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    []
  );

  // expose a stable ref object whose .current points to the drag handle element
  const exposedRef = useRef<HTMLDivElement>(null);
  const stableDragRef: React.RefObject<HTMLDivElement | null> = {
    get current() {
      return exposedRef.current;
    },
    set current(node) {
      (exposedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      setDragHandle(node);
    },
  };

  return (
    <div
      ref={combinedRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        zIndex: 10,
        willChange: 'transform',
        userSelect: 'none',
      }}
    >
      {children(stableDragRef)}
    </div>
  );
}
