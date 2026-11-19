// Disposable local Supabase integration: GoTrue issues JWTs; PostgREST enforces RLS.
const base = process.env.API_URL?.replace(/\/$/, "");
const anon = process.env.ANON_KEY;
const service = process.env.SERVICE_ROLE_KEY;
const password = "Local-K53-Integration-Only-2026!";
const suffix = process.env.GITHUB_RUN_ID ?? String(Date.now());
const email = (name) => `${name}.${suffix}@example.com`;
function assert(ok, message) { if (!ok) throw new Error(message); }
async function call(path, { key, token = key, method = "GET", body, headers = {} }) {
  const response = await fetch(base + path, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: response.ok, status: response.status, data };
}
function value(result, label) {
  if (!result.ok) throw new Error(`${label}: HTTP ${result.status} ${JSON.stringify(result.data)}`);
  return result.data;
}
async function createUser(address, metadata = {}) {
  return value(await call("/auth/v1/admin/users", { key: service, method: "POST", body: { email: address, password, email_confirm: true, user_metadata: metadata } }), "create user");
}
async function signIn(address) {
  const data = value(await call("/auth/v1/token?grant_type=password", { key: anon, method: "POST", body: { email: address, password } }), "sign in");
  assert(data.access_token, "GoTrue did not issue an access token");
  return data;
}
async function rpc(token, name, args = {}) {
  return call(`/rest/v1/rpc/${name}`, { key: anon, token, method: "POST", body: args });
}
async function rest(token, path, options = {}) {
  return call(`/rest/v1/${path}`, { key: anon, token, ...options });
}
async function main() {
  assert(base && anon && service, "Supabase CLI did not export API_URL, ANON_KEY and SERVICE_ROLE_KEY");
  const ownerEmail = "aiamplifysa@gmail.com";
  const learnerEmail = email("learner");
  const attackerEmail = email("attacker");
  const adminEmail = email("google-admin");
  const strangerEmail = email("stranger");
  const ownerUser = await createUser(ownerEmail);
  const learnerUser = await createUser(learnerEmail);
  await createUser(attackerEmail, { role: "owner", roles: ["admin", "owner"] });
  const adminUser = await createUser(adminEmail);
  const strangerUser = await createUser(strangerEmail);
  value(await call(`/auth/v1/admin/users/${adminUser.id}`, {
    key: service, method: "PUT",
    body: { app_metadata: { provider: "google", providers: ["google"], roles: ["admin"] } },
  }), "set trusted admin app_metadata");
  const owner = await signIn(ownerEmail);
  const learner = await signIn(learnerEmail);
  const attacker = await signIn(attackerEmail);
  const admin = await signIn(adminEmail);
  const stranger = await signIn(strangerEmail);

  const added = value(await rpc(owner.access_token, "admin_add_learner_access", { p_email: learnerEmail }), "owner add learner");
  assert(added[0]?.result_status === "created", "owner did not create allowlist record");
  const accessId = added[0].record_id;

  const adminAdded = value(await rpc(admin.access_token, "admin_add_learner_access", { p_email: email("admin-added") }), "Google admin add learner");
  assert(adminAdded[0]?.result_status === "created", "trusted Google admin could not add learner");
  const listed = value(await rpc(admin.access_token, "admin_list_learner_access", { p_search: "admin-added" }), "Google admin list");
  assert(listed.length === 1, "trusted Google admin could not list learner");

  const spoof = await rpc(attacker.access_token, "admin_list_learner_access", { p_search: "" });
  assert(!spoof.ok && spoof.data?.code === "42501", "user_metadata role spoof granted admin access");

  const claim = value(await rpc(learner.access_token, "claim_learner_access"), "learner claim");
  assert(claim[0]?.access_status === "active", "learner first claim failed");
  const access = value(await rest(learner.access_token, "learner_access?select=email,user_id,status"), "learner own access");
  assert(access.length === 1 && access[0].user_id === learnerUser.id, "email was not bound to GoTrue UUID");

  value(await rest(learner.access_token, "profiles", {
    method: "POST", body: { id: learnerUser.id, display_name: "Integration learner" },
    headers: { Prefer: "return=representation" },
  }), "learner profile insert");
  value(await rest(learner.access_token, "question_attempts", {
    method: "POST", body: { id: crypto.randomUUID(), user_id: learnerUser.id, question_id: "ci-q1", category: 1, correct: true },
  }), "learner progress insert");
  const strangerRows = value(await rest(stranger.access_token, "profiles?select=id"), "stranger profile select");
  assert(strangerRows.length === 0, "stranger could read another user's profile");

  assert(value(await rpc(owner.access_token, "admin_set_learner_access_status", { p_id: accessId, p_status: "disabled" }), "disable learner") === true, "disable did not update record");
  assert(value(await rest(learner.access_token, "profiles?select=id"), "disabled profile select").length === 0, "disabled learner retained profile read");
  const denied = await rest(learner.access_token, "profiles", { method: "POST", body: { id: learnerUser.id, display_name: "blocked" } });
  assert(!denied.ok && denied.data?.code === "42501", "disabled learner could still write profile");

  assert(value(await rpc(owner.access_token, "admin_set_learner_access_status", { p_id: accessId, p_status: "active" }), "restore learner") === true, "restore did not update record");
  assert(value(await rpc(learner.access_token, "claim_learner_access"), "reclaim restored learner")[0]?.access_status === "active", "restored learner could not reclaim");
  assert(value(await rest(learner.access_token, "profiles?select=id"), "restored profile select").length === 1, "restored learner lost profile access");
  console.log("PASS: GoTrue JWTs, owner/admin RPCs, user_metadata spoof denial, first claim, RLS, disable and restore.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
