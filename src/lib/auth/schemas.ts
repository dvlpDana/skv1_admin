import { z } from "zod";

export const adminAccountSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  name: z.string().min(1),
  orgType: z.enum(["SKV1", "MADEINLEMON"]),
  authMethod: z.enum(["PASSWORD", "SOCIAL"]),
  active: z.boolean(),
  mustChangePassword: z.boolean(),
  createdAt: z.string(),
});

export const adminLoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresIn: z.union([z.number(), z.string()]),
});
