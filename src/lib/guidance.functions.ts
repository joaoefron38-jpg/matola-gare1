import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runSchoolGuidance } from "./guidance.server";

export const generateSchoolGuidance = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      startingPoint: z.string().trim().min(5, "Descreva o ponto de partida.").max(400),
      needs: z.string().trim().max(600).default(""),
      mode: z.enum(["DRIVE", "WALK", "BICYCLE", "ANY"]).default("ANY"),
    }).parse(input),
  )
  .handler(async ({ data }) => runSchoolGuidance(data));
