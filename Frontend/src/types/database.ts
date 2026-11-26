// Datenbank-Typen für den Supabase-Client (Stand: Supabase/setup.sql).
//
// Aufbau wie bei "supabase gen types typescript". Nach jeder Änderung an setup.sql neu erzeugen:
//   npx supabase login
//   npx supabase gen types typescript --project-id <PROJEKT-ID> --schema public > src/types/database.ts
// (oder per Hand anpassen). Danach meldet `npx tsc --noEmit` jede Abfrage, die nicht mehr passt.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      codes: {
        Row: {
          id: number;
          code: string;
          genutzt: boolean;
          created_at: string;
        };
        Insert: {
          id?: never;
          code: string;
          genutzt?: boolean;
          created_at?: string;
        };
        Update: {
          id?: never;
          code?: string;
          genutzt?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      kln_admins: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
        Relationships: [];
      };
      kln_profiles: {
        Row: { user_id: string; username: string; created_at: string };
        Insert: { user_id: string; username: string; created_at?: string };
        Update: { user_id?: string; username?: string; created_at?: string };
        Relationships: [];
      };
      kln_lockers: {
        Row: {
          id: string;
          name: string;
          host: string;
          port: number;
          https: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          host: string;
          port?: number;
          https?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          host?: string;
          port?: number;
          https?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      kln_locker_secrets: {
        Row: { locker_id: string; key_hex: string };
        Insert: { locker_id: string; key_hex: string };
        Update: { locker_id?: string; key_hex?: string };
        Relationships: [
          {
            foreignKeyName: "kln_locker_secrets_locker_id_fkey";
            columns: ["locker_id"];
            isOneToOne: true;
            referencedRelation: "kln_lockers";
            referencedColumns: ["id"];
          },
        ];
      };
      kln_locker_members: {
        Row: { locker_id: string; user_id: string };
        Insert: { locker_id: string; user_id: string };
        Update: { locker_id?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: "kln_locker_members_locker_id_fkey";
            columns: ["locker_id"];
            isOneToOne: false;
            referencedRelation: "kln_lockers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      kln_is_admin: { Args: never; Returns: boolean };
      kln_can_access: { Args: { p_locker: string }; Returns: boolean };
      kln_check_invite: { Args: { p_code: string }; Returns: boolean };
      kln_list_users: {
        Args: never;
        Returns: { user_id: string; username: string; is_admin: boolean }[];
      };
      kln_set_admin: {
        Args: { p_user: string; p_admin: boolean };
        Returns: undefined;
      };
      kln_delete_user: { Args: { p_user: string }; Returns: undefined };
      kln_set_member: {
        Args: { p_locker: string; p_user: string; p_allowed: boolean };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type FunctionReturns<T extends keyof PublicSchema["Functions"]> =
  PublicSchema["Functions"][T]["Returns"];
