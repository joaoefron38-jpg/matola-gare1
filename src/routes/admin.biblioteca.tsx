import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/admin/CrudSection";

export const Route = createFileRoute("/admin/biblioteca")({ component: () => (
  <CrudSection table="library_items" title="Gerir Biblioteca" fields={[
    { name: "title", label: "Título", required: true },
    { name: "description", label: "Descrição", type: "textarea" },
    { name: "cover_url", label: "URL da capa", type: "url" },
    { name: "book_link", label: "Link do livro", type: "url" },
    { name: "pdf_link", label: "Link do PDF", type: "url" },
    { name: "external_link", label: "Link externo", type: "url" },
    { name: "allow_download", label: "Permitir download", type: "checkbox" },
  ]} />
)});
