import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RemoteUrlSchema } from "@/lib/schemas/playlist";
import { usePlaylistStore } from "@/store/playlistStore";

export function RemoteUrlDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [errKey, setErrKey] = useState<string | null>(null);

  const submit = () => {
    try {
      RemoteUrlSchema.parse(url.trim());
      setErrKey(null);
      onOpenChange(false);
      void usePlaylistStore.getState().importRemote(url.trim());
      setUrl("");
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrKey(e.issues[0]?.message ?? "errors.invalidUrl");
      } else {
        setErrKey("errors.invalidUrl");
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setUrl("");
          setErrKey(null);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("remote.title")}</DialogTitle>
          <DialogDescription>{t("remote.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            data-testid="remote-url-input"
            type="url"
            placeholder={t("remote.placeholder")}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          {errKey ? <p className="text-xs text-destructive">{t(errKey)}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("remote.cancel")}
          </Button>
          <Button type="button" onClick={submit}>
            {t("remote.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
