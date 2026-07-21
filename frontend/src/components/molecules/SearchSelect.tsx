import { useState } from "react";
import { SearchBar } from "./SearchBar";

export interface SearchSelectOption {
  value: string;
  label: string;
  hint?: string;
}

export interface SearchSelectProps {
  /** Required — there's no visible <label>, so this is the field's only accessible name. */
  "aria-label": string;
  query: string;
  onQueryChange: (value: string) => void;
  options: SearchSelectOption[];
  onSelect: (option: SearchSelectOption) => void;
  isLoading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}

// Generic search-as-you-type picker — reused for both the customer and
// product selectors in ChallanBuilderPage rather than building two
// bespoke lookups. Fully controlled (query/options/onSelect are all
// props): no internal fetch state, matching DataTable's philosophy, so
// the owning page's useQuery decides what "options" means.
export function SearchSelect({
  query,
  onQueryChange,
  options,
  onSelect,
  isLoading = false,
  placeholder = "Search...",
  emptyMessage = "No results found.",
  "aria-label": ariaLabel,
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const showDropdown = isOpen && query.length > 0;

  function handleSelect(option: SearchSelectOption) {
    onSelect(option);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <SearchBar
        aria-label={ariaLabel}
        value={query}
        onChange={(value) => {
          onQueryChange(value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder={placeholder}
      />
      {showDropdown && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {isLoading ? (
            <li className="px-3 py-2 text-sm text-slate-500">Searching...</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</li>
          ) : (
            options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  // onMouseDown fires before the input's onBlur, so the
                  // selection registers before the dropdown closes itself.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelect(option);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {option.label}
                  {option.hint && <span className="ml-1 text-slate-400">· {option.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
