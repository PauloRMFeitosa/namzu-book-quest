import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmVariant?: "default" | "destructive";
  isLoading?: boolean;
  /** "sm" = 448px  "md" = 512px  "lg" = 672px */
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

/**
 * Standardized admin modal.
 * Structure: sticky header → scrollable body → sticky footer (Cancelar + Confirm).
 */
export const AdminModal = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Salvar",
  confirmVariant = "default",
  isLoading = false,
  size = "md",
  children,
}: AdminModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className={cn(
        "flex flex-col gap-0 p-0 overflow-hidden",
        size === "lg" && "sm:max-w-2xl",
        size === "md" && "sm:max-w-lg",
        size === "sm" && "sm:max-w-md"
      )}
    >
      {/* Header */}
      <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
        <DialogTitle>{title}</DialogTitle>
        {description && (
          <DialogDescription>{description}</DialogDescription>
        )}
      </DialogHeader>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[65vh] space-y-4">
        {children}
      </div>

      {/* Footer */}
      <DialogFooter className="px-6 py-4 border-t shrink-0">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          variant={confirmVariant}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
