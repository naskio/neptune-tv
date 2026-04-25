import { useTranslation } from "react-i18next";

import { useSearchInputRef } from "@/hooks/useSearchInputRef";
import { useSearchStore } from "@/store/searchStore";
import { Input } from "@/components/ui/input";
import { GlobalSearchResults } from "./GlobalSearchResults";
import { cn } from "@/lib/utils";

export function GlobalSearchInput({ className }: { className?: string }) {
  const { t } = useTranslation();
  const ref = useSearchInputRef();
  const q = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  return (
    <div className={cn("relative min-w-0 flex-1 max-w-md", className)}>
      <Input
        ref={ref}
        data-testid="global-search-input"
        type="search"
        aria-label={t("header.search.label")}
        placeholder={t("header.search.placeholder")}
        value={q}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
      />
      <GlobalSearchResults />
    </div>
  );
}
