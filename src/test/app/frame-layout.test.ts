import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { AppFrame, useScenePanel } from '@/app/frame';

describe('the app frame', () => {
  beforeEach(() => localStorage.clear());

  it('shows the scene panel and the canvas, and closes to a rail', () => {
    const { result } = renderHook(() => useScenePanel());
    const frame = () =>
      createElement(AppFrame, {
        panel: result.current,
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

  it('remembers the panel per viewer', () => {
    const first = renderHook(() => useScenePanel());
    act(() => first.result.current.setWidth(320));
    act(() => first.result.current.setOpen(false));
    const second = renderHook(() => useScenePanel());
    expect(second.result.current.open).toBe(false);
    expect(second.result.current.width).toBe(320);
  });
});
