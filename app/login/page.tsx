import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { LoginCard } from "@/app/components/auth/LoginCard";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  async function handleGoogleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/auth/claim" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
      <LoginCard googleConfigured={googleConfigured} onGoogleSignIn={handleGoogleSignIn} />
    </main>
  );
}
