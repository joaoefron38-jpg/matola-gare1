import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell, EmptyState } from "@/components/AppShell";
import { ContentCard } from "@/components/ContentCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/favoritos")({
  head: () => ({ meta: [
    { title: "Favoritos — Matola Gare" },
    { name: "description", content: "Publicações guardadas na sua conta Matola Gare." },
    { property: "og:title", content: "Favoritos — Matola Gare" },
    { property: "og:description", content: "Publicações guardadas na sua conta Matola Gare." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    
  ] }),
  component: Favoritos,
});

function Favoritos() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !isAuthenticated) navigate({ to: "/auth" }); }, [loading, isAuthenticated, navigate]);

  const { data } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const favs = (await supabase.from("favorites").select("*").eq("user_id", user!.id)).data ?? [];
      const libIds = favs.filter((f) => f.item_type === "library").map((f) => f.item_id);
      const knIds = favs.filter((f) => f.item_type === "knowledge").map((f) => f.item_id);
      const [lib, kn] = await Promise.all([
        libIds.length ? supabase.from("library_items").select("*").in("id", libIds) : Promise.resolve({ data: [] as any[] }),
        knIds.length ? supabase.from("knowledge_items").select("*").in("id", knIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      return { library: lib.data ?? [], knowledge: kn.data ?? [] };
    },
    enabled: !!user,
  });

  const total = (data?.library.length ?? 0) + (data?.knowledge.length ?? 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Meus Favoritos</h1>
        {total === 0 ? (
          <EmptyState icon={Heart} title="Sem favoritos" message="Guarde conteúdos com o coração para os encontrar aqui." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data!.library.map((it: any) => (
              <ContentCard key={it.id} item={{ type: "library", id: it.id, title: it.title, description: it.description, image: it.cover_url, bookLink: it.book_link, pdfLink: it.pdf_link, externalLink: it.external_link, allowDownload: it.allow_download }} />
            ))}
            {data!.knowledge.map((it: any) => (
              <ContentCard key={it.id} item={{ type: "knowledge", id: it.id, title: it.title, description: it.description, image: it.thumbnail_url, videoLink: it.video_url, externalLink: it.external_link, pdfLink: it.pdf_link }} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
