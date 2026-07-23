import { Button } from "@stockhawk/ui/button";
import { useState, type FormEvent } from "react";

import { useLoginCommand } from "../command-boundary/use-login-command";

export const LoginPage = () => {
  const [password, setPassword] = useState("");
  const login = useLoginCommand();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length === 0 || login.isPending) {
      return;
    }
    const submittedPassword = password;
    setPassword("");
    login.login(submittedPassword);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="mb-5 flex items-center gap-2.25 text-heading-3">
          <svg
            aria-hidden="true"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M16 7h.01M3.4 18H12a8 8 0 0 0 8-8V7l1.8-2.4-3.3.6A8 8 0 0 0 5 11v1c0 1.7-.7 3.3-2 4.5L1.8 18H5v3" />
          </svg>
          StockHawk
        </div>
        <h1 className="text-heading-2" id="login-title">
          Private owner login
        </h1>
        <p className="mt-1 text-body text-muted-foreground">
          Sign in to access catalog data and owner controls.
        </p>
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <div className="grid gap-1.5">
            <label className="text-label" htmlFor="admin-password">
              Admin password
            </label>
            <input
              autoComplete="current-password"
              className="h-9 rounded-md border border-input bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              id="admin-password"
              maxLength={1_024}
              minLength={1}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              type="password"
              value={password}
            />
          </div>
          {login.failed ? (
            <p className="text-body text-danger" role="alert">
              Login failed. Check the password and try again.
            </p>
          ) : null}
          <Button disabled={login.isPending} type="submit">
            {login.isPending ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </section>
    </main>
  );
};
