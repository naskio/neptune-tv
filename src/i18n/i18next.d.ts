import "i18next";

declare module "i18next" {
  /**
   * We deliberately do not bind `resources` to `EnglishResources` here:
   * many call sites pass dynamic keys (Zod issue messages, lookup-table
   * values, virtual-group keys), and pinning resources widens those errors
   * across the codebase. `returnNull: false` is the only contract we need
   * for typing return values as `string`.
   */
  interface CustomTypeOptions {
    defaultNS: "translation";
    returnNull: false;
  }
}
