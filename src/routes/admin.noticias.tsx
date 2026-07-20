import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/admin/CrudSection";

export const Route = createFileRoute("/admin/noticias")({ component: () => (
  <CrudSection table="news_items" title="Gerir Notícias e Avisos" orderBy="published_at" fields={[
    { name: "title", label: "Título", required: true },
    { name: "body", label: "Conteúdo", type: "textarea", required: true },
    { name: "image_url", label: "Imagem (URL)", type: "url" },
    { name: "published_at", label: "Data de publicação (ISO)", type: "text" },
  ]} />
)});
