import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PropertyGroup } from "@/components/properties/group";

describe("PropertyGroup", () => {
  it("renders title and content by default (expanded)", () => {
    render(
      <PropertyGroup title="Group A">
        <div data-testid="content">Hello</div>
      </PropertyGroup>,
    );
    expect(screen.getByText("Group A")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("can default to collapsed and toggle open", () => {
    render(
      <PropertyGroup title="Advanced" defaultCollapsed>
        <div data-testid="adv">Advanced content</div>
      </PropertyGroup>,
    );
    // collapsed: content hidden
    expect(screen.queryByTestId("adv")).toBeNull();
    // toggle open by clicking header button (label)
    fireEvent.click(screen.getByRole("button", { name: /advanced/i }));
    expect(screen.getByTestId("adv")).toBeInTheDocument();
  });

  it("respects controlled collapsed prop", () => {
    const { rerender } = render(
      <PropertyGroup title="Controlled" collapsed>
        <div data-testid="c">C</div>
      </PropertyGroup>,
    );
    expect(screen.queryByTestId("c")).toBeNull();
    rerender(
      <PropertyGroup title="Controlled" collapsed={false}>
        <div data-testid="c">C</div>
      </PropertyGroup>,
    );
    expect(screen.getByTestId("c")).toBeInTheDocument();
  });

  it("non-collapsible renders without toggle and stays expanded", () => {
    render(
      <PropertyGroup title="Static" collapsible={false}>
        <div data-testid="static">S</div>
      </PropertyGroup>,
    );
    expect(screen.getByTestId("static")).toBeInTheDocument();
  });
});
