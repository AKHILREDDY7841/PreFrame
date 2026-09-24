import { createClient } from "@supabase/supabase-js";
const config = window.__PREFRAME_PUBLIC_CONFIG__ || {
    url: "https://tvrhjgwegascckqsfmtk.supabase.co",
    publishableKey: "sb_publishable_kSXrGkTqoCj2G6GX0__YMA_I1HmXTwf",
};
export const supabase = createClient(config.url, config.publishableKey, { auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
const asProject = (row) => ({
    id: row.id, ownerId: row.owner_id, title: row.title,
    timezone: row.timezone, revision: row.revision, updatedAt: row.updated_at,
});
export class CloudProjectRepository {
    async getIdentity() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user)
            return null;
        const { data: profile, error: profileError } = await supabase.from("profiles")
            .select("id,display_name,tier").eq("id", user.id).single();
        if (profileError || !profile)
            throw new Error(profileError?.message || "Profile unavailable");
        const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
        if (adminError)
            throw new Error(adminError.message);
        return { profile: { id: profile.id, displayName: profile.display_name || "Member", tier: profile.tier }, isAdmin: isAdmin === true };
    }
    async listProjects() {
        const { data, error } = await supabase.from("projects")
            .select("id,owner_id,title,timezone,revision,updated_at")
            .is("archived_at", null).order("updated_at", { ascending: false });
        if (error)
            throw new Error(error.message);
        return (data || []).map((row) => asProject(row));
    }
    async getProject(id) {
        const { data, error } = await supabase.from("projects")
            .select("id,owner_id,title,timezone,revision,updated_at")
            .eq("id", id).is("archived_at", null).maybeSingle();
        if (error)
            throw new Error(error.message);
        return data ? asProject(data) : null;
    }
    async saveProject(project, expectedRevision) {
        if (!navigator.onLine)
            return { kind: "offline", message: "No network connection" };
        const { data, error } = await supabase.rpc("rename_project", {
            p_project: project.id, p_title: project.title, p_expected_revision: expectedRevision,
        });
        if (error?.code === "40001" || error?.message.includes("revision conflict")) {
            const latest = await this.getProject(project.id);
            return latest ? { kind: "conflict", latest: { value: latest, revision: latest.revision } } : { kind: "offline", message: "Project unavailable" };
        }
        if (error || !data)
            return { kind: "offline", message: error?.message || "Write failed" };
        const value = asProject(data);
        return { kind: "ok", value: { value, revision: value.revision } };
    }
    async createProject(title, timezone) {
        const { data, error } = await supabase.rpc("create_project_limited", { p_title: title, p_timezone: timezone });
        if (error || !data)
            throw new Error(error?.message || "Could not create project");
        return data;
    }
    async inviteEditor(projectId, email) {
        const { error } = await supabase.rpc("invite_editor", { p_project: projectId, p_email: email });
        if (error)
            throw new Error(error.message);
    }
    async invitations() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email)
            return [];
        const { data, error } = await supabase.from("project_invitations")
            .select("id,project_id,invitee_email").eq("invitee_email", user.email.toLowerCase())
            .is("accepted_at", null).is("revoked_at", null);
        if (error)
            throw new Error(error.message);
        return data || [];
    }
    async acceptInvitation(id) {
        const { data, error } = await supabase.rpc("accept_project_invitation", { p_invitation: id });
        if (error || !data)
            throw new Error(error?.message || "Invitation unavailable");
        return data;
    }
    async members(projectId) {
        const { data, error } = await supabase.from("project_members").select("user_id,role").eq("project_id", projectId);
        if (error)
            throw new Error(error.message);
        return data || [];
    }
    async removeEditor(projectId, userId) {
        const { error } = await supabase.rpc("remove_editor", { p_project: projectId, p_user: userId });
        if (error)
            throw new Error(error.message);
    }
}
