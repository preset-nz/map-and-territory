import {
  FreeformAdapter,
  type FreeformState,
} from "@/layers/adapters/freeform-hex";

describe("Freeform texture render mode", () => {
  it("includes render mode and texture id in invalidation key", () => {
    const baseState: FreeformState = {
      cells: {},
      opacity: 1,
      brushTerrainId: undefined,
      brushColor: undefined,
      fillMode: "auto",
      renderMode: "paint",
      textureFill: null,
      textureFillInvert: false,
      textureOffsetX: 0,
      textureOffsetY: 0,
      textureScale: 1,
      textureRotation: 0,
      textureTiling: "stretch",
    };
    const textureState: FreeformState = {
      ...baseState,
      renderMode: "texture-fill",
      textureFill: {
        id: "tx-1",
        name: "texture.png",
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,AAA",
        width: 256,
        height: 256,
      },
    };

    const paintKey = FreeformAdapter.getInvalidationKey?.(baseState);
    const textureKey = FreeformAdapter.getInvalidationKey?.(textureState);

    expect(paintKey).not.toEqual(textureKey);
    expect(textureKey).toContain("texture-fill");
    expect(textureKey).toContain("tx-1");
  });

  it("changes key when texture transform updates", () => {
    const state: FreeformState = {
      cells: { "0,0": {} },
      opacity: 1,
      brushTerrainId: undefined,
      brushColor: undefined,
      fillMode: "auto",
      renderMode: "texture-fill",
      textureFill: {
        id: "tx-1",
        name: "texture.png",
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,AAA",
        width: 256,
        height: 256,
      },
      textureFillInvert: false,
      textureOffsetX: 0,
      textureOffsetY: 0,
      textureScale: 1,
      textureRotation: 0,
      textureTiling: "stretch",
    };

    const keyA = FreeformAdapter.getInvalidationKey?.(state);
    const keyB = FreeformAdapter.getInvalidationKey?.({
      ...state,
      textureOffsetX: 25,
      textureScale: 1.5,
      textureRotation: 45,
      textureTiling: "repeat",
    });

    expect(keyA).not.toEqual(keyB);
  });
});
