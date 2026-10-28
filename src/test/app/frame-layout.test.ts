import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { AppFrame, useFooterHeight, useInspectorPanel, useScenePanel } from '@/app/frame';

describe('the app frame', () => {
  beforeEach(() => localStorage.clear());

  it('shows the scene panel and the canvas, and closes to a rail', () => {
    const { result } = renderHook(() => useScenePanel());
    const inspector = renderHook(() => useInspectorPanel());
    const frame = () =>
      createElement(AppFrame, {
        panel: result.current,
        inspectorPanel: inspector.result.current,
        inspector: createElement('p', null, 'the inspector'),
        scene: createElement('p', null, 'the scene'),
        canvas: createElement('canvas', { 'data-testid': 'canvas' }),
      });
    const view = render(frame());
    expect(view.getByText('the scene')).toBeTruthy();
    expect(view.getByTestId('canvas')).toBeTruthy();

    act(() => result.current.toggle());
    view.rerender(frame());
    expect(view.queryByText('the scene')).toBeNull();

    fireEvent.click(view.getByLabelText('Show Scene'));
    view.rerender(frame());
    expect(view.getByText('the scene')).toBeTruthy();
  });

  it('has an inspector on the right that opens and closes on its own', () => {
    const scene = renderHook(() => useScenePanel());
    const inspector = renderHook(() => useInspectorPanel());
    const frame = () =>
      createElement(AppFrame, {
        panel: scene.result.current,
        inspectorPanel: inspector.result.current,
        inspector: createElement('p', null, 'the inspector'),
        scene: createElement('p', null, 'the scene'),
        canvas: createElement('canvas'),
      });
    const view = render(frame());
    expect(view.getByText('the inspector')).toBeTruthy();
    // a long inspector scrolls inside the panel, not off the window
    expect(view.getByText('the inspector').parentElement?.dataset.slot).toBe('side-panel-content');
    act(() => inspector.result.current.toggle());
    view.rerender(frame());
    expect(view.queryByText('the inspector')).toBeNull();
    expect(view.getByText('the scene')).toBeTruthy();
  });

  it('puts the toolbar across the full width, above both panels', () => {
    const scene = renderHook(() => useScenePanel());
    const inspector = renderHook(() => useInspectorPanel());
    const view = render(
      createElement(AppFrame, {
        panel: scene.result.current,
        inspectorPanel: inspector.result.current,
        inspector: createElement('p', null, 'the inspector'),
        scene: createElement('p', null, 'the scene'),
        toolbar: createElement('div', { 'data-testid': 'toolbar' }),
        canvas: createElement('canvas'),
      }),
    );
    const toolbar = view.getByTestId('toolbar');
    const root = view.container.firstElementChild;
    expect(toolbar.parentElement).toBe(root);
    expect(toolbar.parentElement?.contains(view.getByText('the scene'))).toBe(true);
    expect(toolbar.contains(view.getByText('the scene'))).toBe(false);
  });

  it('remembers the panel per viewer', () => {
    const first = renderHook(() => useScenePanel());
    act(() => first.result.current.setWidth(320));
    act(() => first.result.current.setOpen(false));
    const second = renderHook(() => useScenePanel());
    expect(second.result.current.open).toBe(false);
    expect(second.result.current.width).toBe(320);
  });

  it('keeps the palette strip’s height per viewer, never below its least', () => {
    const first = renderHook(() => useFooterHeight('palette-strip'));
    expect(first.result.current.height).toBe(180);
    act(() => first.result.current.setHeight(260.4));
    expect(first.result.current.height).toBe(260);
    act(() => first.result.current.setHeight(10));
    expect(first.result.current.height).toBe(72);
    act(() => first.result.current.setHeight(300));
    const second = renderHook(() => useFooterHeight('palette-strip'));
    expect(second.result.current.height).toBe(300);
  });

  it('drags the footer taller by its top edge', () => {
    const { result } = renderHook(() => useScenePanel());
    const inspector = renderHook(() => useInspectorPanel());
    const view = render(
      createElement(AppFrame, {
        panel: result.current,
        inspectorPanel: inspector.result.current,
        inspector: createElement('p', null, 'the inspector'),
        inspectorFooter: createElement('p', null, 'the strip'),
        scene: createElement('p', null, 'the scene'),
        canvas: createElement('canvas'),
      }),
    );
    const edge = view.getByLabelText('Resize Setting');
    fireEvent.keyDown(edge, { key: 'ArrowUp' });
    expect(edge.getAttribute('aria-valuenow')).toBe('196');
    expect(view.getByText('the strip')).toBeTruthy();
  });
});
