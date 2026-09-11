import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RotateCw, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { cn, initials, timeAgo } from "@/lib/utils";
import type { Message } from "@/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface ThreadMeta {
  id: string;
  property: { id: string; title: string; images: string[] } | null;
  other: { id: string; full_name: string | null } | null;
}

export default function ChatThreadPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user, session } = useAuth();
  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(false);

    const [convRes, msgRes] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, property:property_id(id,title,images), user_one:user_one_id(id, full_name), user_two:user_two_id(id, full_name)")
        .eq("id", conversationId)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);

    if (convRes.error || !convRes.data) {
      setError(true);
      setLoading(false);
      return;
    }

    const conv = convRes.data as unknown as {
      property: { id: string; title: string; images: string[] } | { id: string; title: string; images: string[] }[] | null;
      user_one: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
      user_two: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
    };
    const first = <T extends { id: string }>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? (v[0] ?? null) : v;
    const property = first(conv.property);
    const userOne = first(conv.user_one);
    const userTwo = first(conv.user_two);
    const other = user?.id === userOne?.id ? userTwo : userOne;

    setMeta({
      id: conversationId,
      property: property ? { id: property.id, title: property.title, images: property.images ?? [] } : null,
      other: other ? { id: other.id, full_name: other.full_name ?? null } : null,
    });

    if (msgRes.error) {
      setError(true);
      setMessages([]);
    } else {
      setMessages((msgRes.data as Message[]) ?? []);
    }
    setLoading(false);

    // Mark inbound messages as read
    supabase.rpc("mark_conversation_read", { conversation: conversationId }).then(() => {}, () => {});
  }, [conversationId, user?.id]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  // Live realtime subscription
  useEffect(() => {
    if (!session || !conversationId) return;
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          supabase.rpc("mark_conversation_read", { conversation: conversationId }).then(() => {}, () => {});
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const msg = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read_at: msg.read_at } : m)));
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setReconnecting(false);
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setReconnecting(true);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!session || !user || !conversationId || !trimmed || sending) return;
    setSending(true);
    setSendError(null);
    const optimistic: Message = {
      id: `pending-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmed,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setContent("");
    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmed,
    });
    setSending(false);
    if (insertError) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setSendError("We couldn't send your message. Please try again.");
    }
  }

  if (error) {
    return (
      <div className="container-app py-16 text-center">
        <p className="text-ink-500">This conversation isn&apos;t available or you don&apos;t have access to it.</p>
        <Link to="/inbox" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
          Back to messages
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-3xl flex-col px-3 pt-4 pb-20 sm:px-0 lg:h-[calc(100dvh-7rem)] lg:py-4">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-ink-200 bg-white px-4 py-3">
        <Link to="/inbox" className="rounded-lg p-1.5 text-ink-600 hover:bg-ink-100" aria-label="Back to messages">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {initials(meta?.other?.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">
            {loading ? "Loading…" : meta?.other?.full_name ?? "RentHub member"}
          </p>
          <Link to={`/property/${meta?.property?.id ?? ""}`} className="block truncate text-xs text-ink-500 hover:text-brand-600">
            {meta?.property?.title ?? ""}
          </Link>
        </div>
        {reconnecting && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <RotateCw className="h-3.5 w-3.5 animate-spin" /> Reconnecting…
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto border border-ink-200 bg-ink-50 p-4">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className={cn("h-12 w-1/2 rounded-xl", i % 2 ? "ml-auto" : "")} />)
        }
        {!loading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-ink-500">
            Say hello and ask anything about the property.
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]",
                  mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-ink-900",
                )}
              >
                <p className="whitespace-pre-line break-words">{m.content}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-brand-100" : "text-ink-400")}>
                  {timeAgo(m.created_at)}
                  {mine && m.read_at ? " · Read" : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="rounded-b-2xl border border-t-0 border-ink-200 bg-white p-3">
        {sendError && <p className="mb-2 text-sm text-red-600">{sendError}</p>}
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            className="max-h-32 min-h-[2.75rem] flex-1 resize-none"
            placeholder="Write a message…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(e as unknown as FormEvent);
              }
            }}
            aria-label="Message"
          />
          <Button type="submit" size="icon" disabled={!content.trim() || loading} loading={sending} aria-label="Send message">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}