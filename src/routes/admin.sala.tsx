import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/admin/CrudSection";

export const Route = createFileRoute("/admin/sala")({ component: () => (
  <CrudSection table="knowledge_items" title="Gerir Sala do Conhecimento" fields={[
    { name: "title", label: "Título", required: true },
    { name: "description", label: "Descrição", type: "textarea" },
    { name: "thumbnail_url", label: "Miniatura (URL)", type: "url" },
    { name: "video_url", label: "URL do vídeo (YouTube/etc)", type: "url" },
    { name: "external_link", label: "Link externo", type: "url" },
    { name: "pdf_link", label: "Material PDF", type: "url" },
  ]} />
)});
