import { createFileRoute } from "@tanstack/react-router";
import { CrudSection } from "@/components/admin/CrudSection";

export const Route = createFileRoute("/admin/biblioteca")({ head: () => ({ meta: [
    { title: "Biblioteca — Administração Matola Gare" },
    { name: "description", content: "Gestão dos livros e documentos publicados pela escola." },
    { property: "og:title", content: "Biblioteca — Administração Matola Gare" },
    { property: "og:description", content: "Gestão dos livros e documentos publicados pela escola." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }), component: () => (
  <CrudSection table="library_items" title="Gerir Biblioteca" fields={[
    { name: "title", label: "Título", required: true },
    { name: "description", label: "Descrição", type: "textarea" },
    { name: "cover_url", label: "Capa do livro", type: "url", upload: { accept: "image/*", folder: "capas" } },
    { name: "book_link", label: "Ficheiro do livro", type: "url", upload: { accept: "application/pdf,application/epub+zip,.pdf,.epub", folder: "livros" } },
    { name: "pdf_link", label: "PDF adicional", type: "url", upload: { accept: "application/pdf,.pdf", folder: "pdfs" } },
    { name: "external_link", label: "Link externo", type: "url" },
    { name: "allow_download", label: "Permitir download", type: "checkbox" },
  ]} />
)});
