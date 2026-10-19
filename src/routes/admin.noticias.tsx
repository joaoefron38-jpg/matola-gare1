import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/admin/CrudSection";

export const Route = createFileRoute("/admin/noticias")({ head: () => ({ meta: [
    { title: "Notícias — Administração Matola Gare" },
    { name: "description", content: "Gestão de notícias e avisos da escola." },
    { property: "og:title", content: "Notícias — Administração Matola Gare" },
    { property: "og:description", content: "Gestão de notícias e avisos da escola." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }), component: () => (
  <CrudSection table="news_items" title="Gerir Notícias e Avisos" orderBy="published_at" fields={[
    { name: "title", label: "Título", required: true },
    { name: "body", label: "Conteúdo", type: "textarea", required: true },
    { name: "image_url", label: "Imagem", type: "url", upload: { accept: "image/*", folder: "noticias" } },
    { name: "published_at", label: "Data e hora da publicação", type: "datetime" },
  ]} />
)});
