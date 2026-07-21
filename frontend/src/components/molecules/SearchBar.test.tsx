import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { SearchBar } from "./SearchBar";

function ControlledSearchBar() {
  const [value, setValue] = useState("");
  return <SearchBar aria-label="Search customers" value={value} onChange={setValue} />;
}

describe("SearchBar", () => {
  it("is reachable by its accessible label and reports typed text", async () => {
    render(<ControlledSearchBar />);

    const search = screen.getByLabelText("Search customers");
    await userEvent.type(search, "Acme");

    expect(search).toHaveValue("Acme");
  });
});
