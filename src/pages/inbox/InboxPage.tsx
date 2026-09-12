import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { timeAgo, initials } from "@/lib/utils";
import type { Conversation, PublicProfile } from "@/types";

interface ConversationRow {
  id: string;
  property_id: string;
  user_one_id: string;
  user_two_id: string;
  last_message_at: string | null;
  created_at: string;
  property: { id: string; title: string; images: string[]; city: string; area: string } | null;
  user_one: PublicProfile | null;
  user_two: PublicProfile | null;
}

const convSelect = `
  id, property_id, user_one_id, user_two_id, last_message_at, created_at,
  property:property_id(id, title, images, city, area),
  user_one:user_one_id(id, full_name, avatar_url, verification_status),
  user_two:user_two_id(id, full_name, avatar_url, verification_status)
`;

export default function InboxPage() {
  useDocumentTitle("Messages — RentHub");
  const { user, session } = useAuth();
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from("conversations")
      .select(convSelect)
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });
    if (err) {
      setError(true);
      return;
    }
    setRows((data as unknown as ConversationRow[]) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const convIds = useMemo(() => (rows ?? []).map((c) => c.id), [rows]);

  // Live updates
  useEffect(() => {
    if (!session || convIds.length === 0) return;
    const channel = supabase
      .channel(`inbox-${user?.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=in.(${convIds.join(",")})` },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, user?.id, convIds, load]);

  const other = (row: ConversationRow): PublicProfile | null => {
    const me = user?.id;
    if (!me) return null;
    if (row.user_one_id === me) return row.user_two;
    if (row.user_two_id === me) return row.user_one;
    return null;
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900">Messages</h1>
      <p className="mt-1 text-sm text-ink-500">Direct conversations with owners and tenants.</p>

      <div className="mt-6 grid gap-2">
        {error && (
          <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
            We couldn&apos;t load your messages. Please try again.
          </div>
        )}
        {!error && rows === null &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        }
        {!error && rows !== null && rows.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="When someone contacts you, your conversations will appear here."
            action={
              <Link to="/search" className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                Find a property
              </Link>
            }
          />
        )}
        {rows?.map((row) => {
          const participant = other(row);
          return (
            <Link
              key={row.id}
              to={`/inbox/${row.id}`}
              className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {initials(participant?.full_name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-ink-900">{participant?.full_name ?? "RentHub member"}</span>
                  {row.last_message_at && (
                    <span className="shrink-0 text-xs text-ink-400">{timeAgo(row.last_message_at)}</span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-sm text-ink-500">
                  {row.property?.title ?? "Property conversation"}
                </span>
                <span className="block truncate text-xs text-ink-400">
                  {row.property ? `${row.property.area}, ${row.property.city}` : ""}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export type { Conversation };