import { signIn } from "@/auth"

export function SignInButton() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("auth0")
      }}
    >
      <button
        type="submit"
        className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        Sign in with Auth0
      </button>
    </form>
  )
}
