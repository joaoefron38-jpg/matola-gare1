import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/admin/CrudSection";

export const Route = createFileRoute("/admin/galeria")({ head: () => ({ meta: [
    { title: "Galeria — Administração Matola Gare" },
    { name: "description", content: "Gestão das fotografias da escola." },
    { property: "og:title", content: "Galeria — Administração Matola Gare" },
    { property: "og:description", content: "Gestão das fotografias da escola." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }), component: () => (
  <CrudSection table="gallery_items" title="Gerir Galeria" fields={[
    { name: "image_url", label: "Imagem", type: "url", required: true, upload: { accept: "image/*", folder: "galeria" } },
    { name: "title", label: "Título" },
    { name: "caption", label: "Legenda", type: "textarea" },
    { name: "category", label: "Categoria" },
  ]} />
)});
