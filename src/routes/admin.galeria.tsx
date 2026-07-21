import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/admin/CrudSection";

export const Route = createFileRoute("/admin/galeria")({ component: () => (
  <CrudSection table="gallery_items" title="Gerir Galeria" fields={[
    { name: "image_url", label: "Imagem", type: "url", required: true, upload: { accept: "image/*", folder: "galeria" } },
    { name: "title", label: "Título" },
    { name: "caption", label: "Legenda", type: "textarea" },
    { name: "category", label: "Categoria" },
  ]} />
)});
