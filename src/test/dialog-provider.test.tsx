import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  DialogProvider,
  useDialog,
} from "@/components/providers/dialog-provider";

function TestHarness() {
  const d = useDialog();
  return (
    <div>
      <button
        onClick={() => d.confirm({ title: "Delete?" })}
        aria-label="open-confirm"
      >
        Open
      </button>
    </div>
  );
}

describe("DialogProvider", () => {
  it("opens confirm and resolves on confirm", async () => {
    render(
      <DialogProvider>
        <TestHarness />
      </DialogProvider>,
    );

    const open = screen.getByLabelText("open-confirm");
    // trigger open
    fireEvent.click(open);

    // dialog title appears
    expect(await screen.findByText("Confirm")).toBeInTheDocument();

    // click confirm
    const ok = screen.getByRole("button", { name: /confirm/i });
    fireEvent.click(ok);

    // dialog should close (query returns null when not found)
    expect(screen.queryByText("Confirm")).toBeNull();
  });
});
