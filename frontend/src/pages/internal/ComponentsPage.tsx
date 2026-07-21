import { useState } from "react";
import type { ReactNode } from "react";
import {
  Badge,
  Button,
  IconButton,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
} from "../../components/atoms";
import { FormField, Modal, Pagination, SearchBar, Toast } from "../../components/molecules";

const BUTTON_VARIANTS = ["primary", "secondary", "danger", "ghost"] as const;
const BUTTON_SIZES = ["sm", "md", "lg"] as const;
const BADGE_VARIANTS = ["neutral", "success", "warning", "danger", "info"] as const;
const SPINNER_SIZES = ["sm", "md", "lg"] as const;
const TOAST_VARIANTS = ["success", "error", "info"] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8 rounded-md bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

// Dev-only visual reference for every atom/molecule and its variants —
// a lightweight substitute for Storybook. See
// specs/FLO-009-design-system-foundation.md's Implementation Notes.
function ComponentsPage() {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Component catalog (dev only)</h1>

      <Section title="Button">
        <div className="flex flex-wrap gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {BUTTON_SIZES.map((size) => (
            <Button key={size} size={size}>
              size {size}
            </Button>
          ))}
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Input / Select / Textarea">
        <Input placeholder="Text input" aria-label="Text input demo" />
        <Input placeholder="Invalid input" hasError aria-label="Invalid input demo" />
        <Select
          aria-label="Select demo"
          placeholder="Choose a type..."
          options={[
            { value: "retail", label: "Retail" },
            { value: "wholesale", label: "Wholesale" },
          ]}
        />
        <Textarea placeholder="Notes..." aria-label="Textarea demo" />
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Spinner">
        <div className="flex items-center gap-4">
          {SPINNER_SIZES.map((size) => (
            <Spinner key={size} size={size} label={`Loading ${size}`} />
          ))}
        </div>
      </Section>

      <Section title="Label / IconButton">
        <Label>Default label</Label>
        <Label required>Required label</Label>
        <div className="flex gap-2">
          <IconButton icon={<span aria-hidden="true">✎</span>} label="Edit" variant="ghost" />
          <IconButton icon={<span aria-hidden="true">🗑</span>} label="Delete" variant="solid" />
        </div>
      </Section>

      <Section title="FormField">
        <FormField label="Customer name" htmlFor="demo-name">
          <Input placeholder="Acme Distribution" />
        </FormField>
        <FormField label="Mobile" htmlFor="demo-mobile" required error="Mobile number is required">
          <Input placeholder="9876543210" />
        </FormField>
        <FormField label="GST number" htmlFor="demo-gst" hint="Optional, format: 22AAAAA0000A1Z5">
          <Input placeholder="GSTIN" />
        </FormField>
      </Section>

      <Section title="SearchBar">
        <SearchBar aria-label="Search demo" value={search} onChange={setSearch} />
      </Section>

      <Section title="Pagination">
        <Pagination meta={{ page, limit: 10, total: 45, totalPages: 5 }} onPageChange={setPage} />
      </Section>

      <Section title="Modal">
        <Button onClick={() => setIsModalOpen(true)}>Open modal</Button>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Confirm action">
          <p className="mb-4 text-sm text-slate-600">This is a demo modal body.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setIsModalOpen(false)}>
              Confirm
            </Button>
          </div>
        </Modal>
      </Section>

      <Section title="Toast">
        <div className="flex flex-col gap-2">
          {TOAST_VARIANTS.map((variant) => (
            <Toast
              key={variant}
              variant={variant}
              message={`${variant} toast message`}
              onDismiss={() => undefined}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

export default ComponentsPage;
