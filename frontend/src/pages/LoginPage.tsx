import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Input } from "../components/atoms";
import { FormField } from "../components/molecules";
import { AuthLayoutTemplate } from "../components/templates";
import { ApiError } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";

interface LocationState {
  from?: { pathname: string };
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("admin@flowerp.test");
  const [password, setPassword] = useState("FlowERP123!");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as LocationState | null)?.from?.pathname ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password, remember);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayoutTemplate
      title="Welcome Back"
      subtitle="Manage your wholesale distribution operations with ease"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <FormField label="Email Address" htmlFor="email">
          <Input
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </FormField>
        <FormField label="Password" htmlFor="password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-slate-300"
          />
          Stay logged in for 30 days
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Log in
        </Button>
        <p className="text-center text-xs text-slate-500">
          Need login credentials? Find them in the{" "}
          <a
            href="https://github.com/SharmaSamridhhi/FlowERP#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:underline"
          >
            project README
          </a>
          .
        </p>
      </form>
    </AuthLayoutTemplate>
  );
}

export default LoginPage;
