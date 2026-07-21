import type { InputHTMLAttributes } from "react";
import { Input } from "../atoms/Input";

export interface SearchBarProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "value"
> {
  value: string;
  onChange: (value: string) => void;
  /** Required — there's no visible <label>, so this is the field's only accessible name. */
  "aria-label": string;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search...", ...rest }: SearchBarProps) {
  return (
    <Input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      {...rest}
    />
  );
}
