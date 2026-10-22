import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start";
import type { ModelMessage } from "ai";
import type { Database } from "@/integrations/supabase/types";
import { createResponsesCall } from "./ai/responses";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export type GuidanceMode = "DRIVE" | "WALK" | "BICYCLE" | "ANY";
export type GuidanceInput = { startingPoint: string; needs: string; mode: GuidanceMode };

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 12;
const rateHits = new Map<string, { count: number; resetAt: number }>();

const MODE_LABEL: Record<GuidanceMode, string> = {
  DRIVE: "de carro (ou chapa/mota)",
  WALK: "a pé",
  BICYCLE: "de bicicleta",
  ANY: "qualquer meio de transporte",
};

/** Limita consultas por endereço IP para proteger os créditos de IA. */
function checkRateLimit(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "anon";
  const now = Date.now();
  const hit = rateHits.get(ip);
  if (!hit || hit.resetAt < now) {
    rateHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (rateHits.size > 5000) rateHits.clear();
    return;
  }
  if (hit.count >= RATE_MAX) {
    throw new Error("Muitas consultas seguidas neste dispositivo. Tente novamente dentro de uma hora.");
  }
  hit.count += 1;
}

function createPublicSupabase() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    // Chaves opacas sb_ não são JWT; enviar apenas apikey, sem Authorization bearer.
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  return supabasePublic;
}

export async function runSchoolGuidance(input: GuidanceInput) {
  const request = getRequest();
  checkRateLimit(request);

  const supabasePublic = createPublicSupabase();
  const { data: school } = await supabasePublic
    .from("school_info")
    .select("name,address,schedule,latitude,longitude")
    .eq("id", 1)
    .maybeSingle();

  const schoolName = school?.name || "Escola Secundária da Matola Gare";
  const schoolLines = [
    `Nome: ${schoolName}`,
    `Localização: Matola Gare, Cidade da Matola, Província de Maputo, Moçambique`,
    school?.address ? `Endereço conhecido: ${school.address}` : null,
    school?.latitude != null && school?.longitude != null
      ? `Coordenadas: ${school.latitude}, ${school.longitude}`
      : null,
    school?.schedule ? `Horário: ${school.schedule}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const instructions = [
    `És o assistente de deslocações da plataforma ${schoolName}.`,
    "Escreve SEMPRE em português, com linguagem simples e direta, para estudantes do ensino secundário de Moçambique.",
    "Usa apenas a informação da escola fornecida na mensagem; não inventes nomes de ruas, bairros, preços ou serviços que não conheces.",
    "Se não conheças a zona indicada pelo estudante, dá orientações gerais seguras e recomenda confirmar o trajeto no Google Maps.",
    "Nunca aconselhes atalhos perigosos nem deslocações de noite desnecessárias; inclui uma dica de segurança.",
    "Estrutura a resposta em secções curtas com títulos e frases curtas: \"Resumo\", \"Como chegar\", \"Dicas\" e \"Alternativa\". Máximo 220 palavras.",
  ].join(" ");

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        `Informação da escola:\n${schoolLines}`,
        `Ponto de partida descrito pelo estudante: ${input.startingPoint}`,
        input.needs.trim() ? `Necessidades e preferências: ${input.needs.trim()}` : null,
        `Meio de transporte preferido: ${MODE_LABEL[input.mode]}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("A orientação por IA não está disponível neste momento.");

  const { result } = createResponsesCall(
    request,
    { baseURL: GATEWAY_URL, apiKey, model: MODEL },
    messages,
    instructions,
  );

  let text: string;
  try {
    text = (await result.text).trim();
  } catch (error) {
    console.error("AI guidance failed", error);
    const message = error instanceof Error ? error.message : "";
    if (/\b40[234]\b|\b429\b|credit|denied|refus/i.test(message)) throw new Error(message);
    throw new Error("Não foi possível gerar a orientação agora. Tente novamente em instantes.");
  }
  if (!text) throw new Error("A orientação chegou vazia. Tente novamente.");

  return { text };
}
