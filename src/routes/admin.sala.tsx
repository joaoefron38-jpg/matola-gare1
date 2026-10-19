import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/admin/CrudSection";

export const Route = createFileRoute("/admin/sala")({ head: () => ({ meta: [
    { title: "Sala do Conhecimento — Administração Matola Gare" },
    { name: "description", content: "Gestão de vídeos e materiais educativos da escola." },
    { property: "og:title", content: "Sala do Conhecimento — Administração Matola Gare" },
    { property: "og:description", content: "Gestão de vídeos e materiais educativos da escola." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }), component: () => (
  <CrudSection table="knowledge_items" title="Gerir Sala do Conhecimento" fields={[
    { name: "title", label: "Título", required: true },
    { name: "description", label: "Descrição", type: "textarea" },
    { name: "thumbnail_url", label: "Miniatura", type: "url", upload: { accept: "image/*", folder: "miniaturas" } },
    { name: "video_url", label: "Vídeo (URL YouTube ou ficheiro)", type: "url", upload: { accept: "video/*", folder: "videos" } },
    { name: "external_link", label: "Link externo", type: "url" },
    { name: "pdf_link", label: "Material PDF", type: "url", upload: { accept: "application/pdf,.pdf", folder: "materiais" } },
  ]} />
)});
