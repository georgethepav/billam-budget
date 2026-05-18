import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in - Billam Family Budget" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Billam Family Budget
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the household password to continue.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
