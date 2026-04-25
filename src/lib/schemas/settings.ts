import { z } from "zod";

export const ThemeModeSchema = z.enum(["light", "dark", "system"]);

export type ThemeModeInput = z.infer<typeof ThemeModeSchema>;

export const LocaleSchema = z.enum(["en", "fr", "ar", "system"]);

export type LocaleInput = z.infer<typeof LocaleSchema>;
