export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
  /**
   * Set when the spinner sits inside an already-labeled control (e.g.
   * Button's isLoading state) — suppresses its own status role/label so it
   * doesn't get concatenated into the parent's accessible name. The parent
   * should communicate the loading state itself (e.g. aria-busy).
   */
  decorative?: boolean;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({
  size = "md",
  label = "Loading",
  className = "",
  decorative = false,
}: SpinnerProps) {
  return (
    <span
      role={decorative ? undefined : "status"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}
