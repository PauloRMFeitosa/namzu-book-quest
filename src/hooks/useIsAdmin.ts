import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useIsAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      setLoading(true);

      // 1) Try via security definer RPC (most reliable)
      const rpc = await (supabase as any).rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      let admin = false;
      if (!rpc.error && typeof rpc.data === "boolean") {
        admin = rpc.data;
      } else {
        // 2) Fallback: direct table query
        const { data, error } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        admin = !error && !!data;
        if (error) {
          console.warn("[useIsAdmin] fallback query error", { error, userId: user.id });
        }
      }

      console.info("[useIsAdmin] check", {
        userId: user.id,
        email: user.email,
        isAdmin: admin,
        rpcError: rpc.error?.message,
      });

      if (!cancelled) {
        setIsAdmin(admin);
        setLoading(false);
      }
    };
    if (!authLoading) check();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
};
