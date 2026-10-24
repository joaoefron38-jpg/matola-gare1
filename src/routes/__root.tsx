import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-up">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que procura não existe ou foi movida.
        </p>
        <a href="/" className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:shadow-elevation-2 transition-shadow">
          Ir para o início
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo correu mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente ou volte ao início.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
            Tentar novamente
          </button>
          <a href="/" className="rounded-full border border-input px-5 py-2 text-sm font-medium">Início</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Escola Secundária da Matola Gare" },
      { name: "description", content: "Plataforma digital escolar: biblioteca, vídeos, galeria, notícias e localização da Escola Secundária da Matola Gare *#efRon" },
      { name: "author", content: "Escola Secundária da Matola Gare" },
      { name: "theme-color", content: "#3b6cf0" },
      { property: "og:title", content: "Escola Secundária da Matola Gare" },
      { property: "og:description", content: "Plataforma digital escolar: biblioteca, vídeos, galeria, notícias e localização da Escola Secundária da Matola Gare *#efRon" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Escola Secundária da Matola Gare" },
      { name: "twitter:description", content: "Plataforma digital escolar: biblioteca, vídeos, galeria, notícias e localização da Escola Secundária da Matola Gare *#efRon" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0914b492-59ab-430a-8582-6551e03bd908" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0914b492-59ab-430a-8582-6551e03bd908" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent(): JSX.Element {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    // Apply saved theme
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (saved === "dark") document.documentElement.classList.add("dark");
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_IN" && session?.user) {
        supabase.from("sessions_log").insert({
          user_id: session.user.id, email: session.user.email ?? null,
          user_agent: navigator.userAgent,
        }).then(() => {});
      }
      if (evt === "SIGNED_IN" || evt === "SIGNED_OUT" || evt === "USER_UPDATED") {
        router.invalidate();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
