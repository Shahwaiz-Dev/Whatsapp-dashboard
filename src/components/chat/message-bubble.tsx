import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessageBubbleProps {
  body: string;
  direction: "inbound" | "outbound";
  status: string;
  sentAt: string;
}

export function MessageBubble({
  body,
  direction,
  status,
  sentAt,
}: MessageBubbleProps) {
  const isOutbound = direction === "outbound";

  return (
    <div
      className={cn(
        "flex w-full",
        isOutbound ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[75%] rounded-2xl px-3 py-2 shadow-sm",
          isOutbound
            ? "rounded-br-md bg-emerald-600 text-white"
            : "rounded-bl-md bg-white text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            isOutbound ? "text-emerald-100" : "text-muted-foreground"
          )}
        >
          <span>{format(new Date(sentAt), "HH:mm")}</span>
          {isOutbound && (
            <StatusIcon status={status} className="size-3.5" />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  if (status === "read") {
    return <CheckCheck className={cn(className, "text-blue-300")} />;
  }
  if (status === "delivered") {
    return <CheckCheck className={className} />;
  }
  if (status === "sent") {
    return <Check className={className} />;
  }
  return null;
}
