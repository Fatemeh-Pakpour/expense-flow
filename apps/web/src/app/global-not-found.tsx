// Import global styles and fonts
import './globals.css'
import type { Metadata } from 'next'


export const metadata: Metadata = {
    title: '404 - Page Not Found',
    description: 'The page you are looking for does not exist.',
}

export default function GlobalNotFound() {
    return (
        <html lang="en" >
            <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
                <div className="text-center">
                    <p className="text-sm font-medium text-emerald-400 mb-3">ExpenseFlow</p>
                    <h1 className="text-8xl font-bold tracking-tight text-slate-700">404</h1>
                    <p className="mt-4 text-xl font-semibold">Page not found</p>
                    <p className="mt-2 text-slate-400">The page you are looking for does not exist.</p>
                    <a
                        href="/"
                        className="mt-8 inline-block rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-400 transition-colors"
                    >
                        Back to home
                    </a>
                </div>
            </body>
        </html>
    )
}