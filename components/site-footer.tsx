const GITHUB_ICON_PATH =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

/**
 * Site-wide creator attribution. Shown at the bottom of every page: a subtle
 * "Hecho por" line pointing to the author's site and GitHub profile.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200/70 py-6 dark:border-stone-900">
      <div className="mx-auto flex w-full max-w-xl items-center justify-center gap-3 px-4 text-sm text-stone-400 dark:text-stone-500">
        <span className="text-xs font-medium uppercase tracking-wide">
          Hecho por
        </span>
        <a
          href="https://javiercazares.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
        >
          Javier Cazares
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
        </a>
        <span aria-hidden="true" className="text-stone-300 dark:text-stone-700">
          •
        </span>
        <a
          href="https://github.com/javiercaz"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Perfil de GitHub de Javier Cazares"
          className="inline-flex items-center gap-1.5 text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d={GITHUB_ICON_PATH} />
          </svg>
          @javiercaz
        </a>
      </div>
    </footer>
  );
}
