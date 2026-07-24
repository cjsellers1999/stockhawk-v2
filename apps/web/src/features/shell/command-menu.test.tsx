import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CommandMenu } from "./command-menu";

afterEach(cleanup);

describe("private command menu", () => {
  it("opens from the owner shortcut", () => {
    render(<CommandMenu />);

    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });

    expect(screen.getByPlaceholderText("Search commands…")).toBeInTheDocument();
  });
});
