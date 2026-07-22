import { GithubIcon } from "../atoms/icons";

export interface BrandCreditProps {
  className?: string;
  /** Use on dark backgrounds (e.g. the auth panel's gradient). */
  tone?: "muted" | "inverted";
}

const TONE_CLASSES: Record<NonNullable<BrandCreditProps["tone"]>, string> = {
  muted: "text-slate-400 hover:text-slate-600",
  inverted: "text-white/50 hover:text-white/80",
};

// Small, quiet attribution link — appears on every screen (authenticated
// shell via AppSidebar, and the pre-auth AuthLayoutTemplate) without
// stating a name outright; the GitHub handle in the URL is the credit.
export function BrandCredit({ className = "", tone = "muted" }: BrandCreditProps) {
  return (
    <a
      href="https://github.com/SharmaSamridhhi/FlowERP"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-[11px] transition-colors ${TONE_CLASSES[tone]} ${className}`}
    >
      <GithubIcon className="h-3 w-3" />
      Crafted by Samridhhi Sharma
    </a>
  );
}
