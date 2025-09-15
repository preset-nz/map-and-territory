import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SelectField } from "@/components/properties/select";
import { ColorField } from "@/components/properties/color";
import { Int1D, Float2D } from "@/components/properties/number";
import { PropertyLabel } from "@/components/properties/label";
import { CheckboxField } from "@/components/properties/checkbox";

describe("Properties fields", () => {
  it("SelectField fires onChange when not readOnly", () => {
    const options = [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ];
    let v = "a";
    render(
      <SelectField
        label="S"
        value={v}
        options={options}
        onChange={(nv) => (v = nv)}
      />,
    );
    const sel = screen.getByLabelText("S") as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: "b" } });
    expect(v).toBe("b");
  });

  it("SelectField is disabled when readOnly", () => {
    render(
      <SelectField
        label="S"
        value={"a"}
        options={[{ value: "a", label: "A" }]}
        readOnly
      />,
    );
    const sel = screen.getByLabelText("S") as HTMLSelectElement;
    expect(sel.disabled).toBe(true);
  });

  it("ColorField renders inputs and respects readOnly", () => {
    render(<ColorField label="C" value="#000000" readOnly />);
    const color = screen.getByLabelText("C") as HTMLInputElement;
    expect(color.disabled).toBe(true);
  });

  it("Int1D updates value", () => {
    let num = 1;
    render(<Int1D label="I" value={num} onChange={(n) => (num = n)} />);
    const input = screen.getByLabelText("I") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    expect(num).toBe(5);
  });

  it("Float2D updates both components", () => {
    let val: [number, number] = [0, 0];
    render(<Float2D label="F" value={val} onChange={(v) => (val = v)} />);
    const xs = screen.getByPlaceholderText("X") as HTMLInputElement;
    const ys = screen.getByPlaceholderText("Y") as HTMLInputElement;
    fireEvent.change(xs, { target: { value: "0.25" } });
    fireEvent.change(ys, { target: { value: "0.75" } });
    expect(val).toEqual([0.25, 0.75]);
  });

  it("PropertyLabel renders text", () => {
    render(<PropertyLabel text="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("CheckboxField toggles and respects readOnly", () => {
    let checked = false;
    const { rerender } = render(
      <CheckboxField
        label="B"
        value={checked}
        onChange={(v) => {
          checked = v;
        }}
      />,
    );
    const box = screen.getByLabelText("B");
    fireEvent.click(box);
    expect(checked).toBe(true);

    // readOnly disables interaction
    rerender(
      <CheckboxField
        label="B"
        value={checked}
        onChange={(v) => {
          checked = v;
        }}
        readOnly
      />,
    );
    fireEvent.click(screen.getByLabelText("B"));
    expect(checked).toBe(true);
  });
});
