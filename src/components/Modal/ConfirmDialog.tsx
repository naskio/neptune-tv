import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUiStore } from "@/store/uiStore";

export function ConfirmDialog() {
  const { t } = useTranslation();
  const c = useUiStore((s) => s.confirmDialog);
  const open = c != null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          useUiStore.getState().closeConfirm();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{c ? t(c.titleKey) : ""}</AlertDialogTitle>
          <AlertDialogDescription>{c ? t(c.descriptionKey) : ""}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              useUiStore.getState().closeConfirm();
            }}
          >
            {t(c?.cancelLabelKey ?? "confirm.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={c?.destructive ? "destructive" : "default"}
            onClick={() => {
              const run = c?.onConfirm;
              useUiStore.getState().closeConfirm();
              void run?.();
            }}
          >
            {t(c?.confirmLabelKey ?? "confirm.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
