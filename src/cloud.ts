import { createClient } from "@supabase/supabase-js";
import type { Identity, Project } from "./domain.js";
import type { ProjectRepository, WriteResult } from "./repository.js";

// These are public browser settings. Never put a service-role or secret key here.
declare global { interface Window { __PREFRAME_PUBLIC_CONFIG__?: { url: string; publishableKey: string } } }
const config = window.__PREFRAME_PUBLIC_CONFIG__ || {
  url: "https://tvrhjgwegascckqsfmtk.supabase.co",
  publishableKey: "sb_publishable_kSXrGkTqoCj2G6GX0__YMA_I1HmXTwf",
};
export const supabase = createClient(
  config.url,
  config.publishableKey,
  { auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } },
);

type ProjectRow = {
  id: string; owner_id: string; title: string; timezone: string;
  revision: number; updated_at: string; cover_path?: string | null;
};
const asProject = (row: ProjectRow): Project => ({
  id: row.id, ownerId: row.owner_id, title: row.title,
  timezone: row.timezone, revision: row.revision, updatedAt: row.updated_at,
  ...(row.cover_path ? { coverPath: row.cover_path } : {}),
});

export class CloudProjectRepository implements ProjectRepository {
  async getIdentity(): Promise<Identity | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("id,display_name,tier").eq("id", user.id).single();
    if (profileError || !profile) throw new Error(profileError?.message || "Profile unavailable");
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
    if (adminError) throw new Error(adminError.message);
    return { profile: { id: profile.id, displayName: profile.display_name || "Member", tier: profile.tier }, isAdmin: isAdmin === true };
  }
  async listProjects(): Promise<Project[]> {
    const { data, error } = await supabase.from("projects")
      .select("id,owner_id,title,timezone,revision,updated_at,cover_path")
      .is("archived_at", null).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((row) => asProject(row));
  }
  async getProject(id: string): Promise<Project | null> {
    const { data, error } = await supabase.from("projects")
      .select("id,owner_id,title,timezone,revision,updated_at,cover_path")
      .eq("id", id).is("archived_at", null).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? asProject(data) : null;
  }
  async saveProject(project: Project, expectedRevision: number): Promise<WriteResult<Project>> {
    if (!navigator.onLine) return { kind: "offline", message: "No network connection" };
    const { data, error } = await supabase.rpc("rename_project", {
      p_project: project.id, p_title: project.title, p_expected_revision: expectedRevision,
    });
    if (error?.code === "40001" || error?.message.includes("revision conflict")) {
      const latest = await this.getProject(project.id);
      return latest ? { kind: "conflict", latest: { value: latest, revision: latest.revision } } : { kind: "offline", message: "Project unavailable" };
    }
    if (error || !data) return { kind: "offline", message: error?.message || "Write failed" };
    const value = asProject(data as ProjectRow);
    return { kind: "ok", value: { value, revision: value.revision } };
  }
  async createProject(title: string, timezone: string): Promise<string> {
    const { data, error } = await supabase.rpc("create_project_limited", { p_title: title, p_timezone: timezone });
    if (error || !data) throw new Error(error?.message || "Could not create project");
    return data as string;
  }
  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase.rpc("delete_project", { p_project: projectId });
    if (error) throw new Error(error.message);
  }
  async withCoverUrl(project: Project): Promise<Project> {
    if (!project.coverPath) return project;
    const { data, error } = await supabase.storage.from("project-media").createSignedUrl(project.coverPath, 60 * 60);
    if (error || !data?.signedUrl) return project;
    return { ...project, coverUrl: data.signedUrl };
  }
  async updateProjectCover(project: Project, file: Blob): Promise<Project> {
    if (!navigator.onLine) throw new Error("No network connection");
    const path = `${project.id}/covers/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("project-media")
      .upload(path, file, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { data, error } = await supabase.rpc("set_project_cover", {
      p_project: project.id, p_cover_path: path, p_expected_revision: project.revision,
    });
    if (error || !data) {
      await supabase.storage.from("project-media").remove([path]);
      throw new Error(error?.message || "Could not save project cover");
    }
    return this.withCoverUrl(asProject(data as ProjectRow));
  }
  async inviteEditor(projectId: string, email: string): Promise<void> {
    const { error } = await supabase.rpc("invite_editor", { p_project: projectId, p_email: email });
    if (error) throw new Error(error.message);
  }
  async invitations(): Promise<{ id: string; project_id: string; invitee_email: string }[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return [];
    const { data, error } = await supabase.from("project_invitations")
      .select("id,project_id,invitee_email").eq("invitee_email", user.email.toLowerCase())
      .is("accepted_at", null).is("revoked_at", null);
    if (error) throw new Error(error.message);
    return data || [];
  }
  async acceptInvitation(id: string): Promise<string> {
    const { data, error } = await supabase.rpc("accept_project_invitation", { p_invitation: id });
    if (error || !data) throw new Error(error?.message || "Invitation unavailable");
    return data as string;
  }
  async members(projectId: string): Promise<{ user_id: string; role: string }[]> {
    const { data, error } = await supabase.from("project_members").select("user_id,role").eq("project_id", projectId);
    if (error) throw new Error(error.message);
    return data || [];
  }
  async removeEditor(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc("remove_editor", { p_project: projectId, p_user: userId });
    if (error) throw new Error(error.message);
  }
}
