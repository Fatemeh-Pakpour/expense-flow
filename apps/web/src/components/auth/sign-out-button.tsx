import { signOut } from "@/auth"

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server"
        await signOut({ redirectTo: "/" })
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        Sign out
      </button>
    </form>
  )
}
