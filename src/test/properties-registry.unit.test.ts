import { describe, it, expect } from "vitest";
import {
  registerPropertySchema,
  unregisterPropertySchema,
  getPropertySchema,
  type PropertySchema,
} from "@/properties/registry";

describe("Property Registry — register/unregister", () => {
  it("registers and retrieves a schema by scope", () => {
    const scope = "test.scope";
    const schema: PropertySchema = {
      groups: [{ id: "g", title: "G", rows: [] }],
    };
    registerPropertySchema(scope, schema);
    const got = getPropertySchema(scope);
    expect(got).toBeDefined();
    expect(got?.groups[0].id).toBe("g");
  });

  it("unregister removes schema and get returns undefined", () => {
    const scope = "test.remove";
    const schema: PropertySchema = {
      groups: [{ id: "g", title: "G", rows: [] }],
    };
    registerPropertySchema(scope, schema);
    expect(getPropertySchema(scope)).toBeDefined();
    unregisterPropertySchema(scope);
    expect(getPropertySchema(scope)).toBeUndefined();
  });
});
