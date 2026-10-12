# PREFRAME — Free, Premium and Revenue Model Archive

Archived on 2026-10-12. The current requested product is Akhil's private, owner-only filmmaking workspace. This document preserves the commercial product for a future launch; it is not an active subscription offer.

## Confirmed pricing

| Plan | Price | Billing |
| --- | ---: | --- |
| Free | ₹0 | No subscription |
| Premium monthly | ₹49 | Per month |
| Premium yearly | ₹499 | Per year |

Twelve monthly payments total ₹588; yearly billing saves ₹89 (15.14%). Yearly revenue recognized evenly is approximately ₹41.58 per subscriber per month, before costs. These are arithmetic projections, not actual revenue or profit. Do not revive old ₹149/₹199/₹999 launch prices. Checkout was never connected in the archived release: no live billing, renewal, payment settlement, cancellation or refund system exists.

## Archived feature matrix

| Feature | Free baseline | Premium baseline |
| --- | --- | --- |
| Owned projects | One active/recycled project counted toward limit | Multiple projects |
| Screenplay | Writing, scene navigator, formatting, import/export | Included |
| Docs & Notes | Rich text, pasted images, resizing, checklists, references | Included |
| Shot lists | Up to 50 active records | Unrestricted tier cap |
| Storyboards | Premium route gate; historical 50-record Free guard also existed | Included |
| Production schedule | Included | Included |
| Calendar | Premium route gate | Included |
| Call sheets | Premium route gate, read-only published snapshots | Included |
| Locations | Premium route gate | Included |
| Collaboration | Not available | Project invitations/codes and editors |
| Typical collaboration capacity | Not applicable | Owner plus two editors; administrator bypassed seat limit |
| Project recycle bin | 15-day recovery window | 15-day recovery window |
| Export/backup | Project/data export | Included |
| Support/donation | Placeholder only; no checkout | Subscription revenue intended |

Historical conflicts between frontend and backend gates must be resolved before restoring a public release. Unlimited records/seats describe old tier gates; they are not promises of unlimited provider storage or bandwidth.

## Revenue and cost model

Primary revenue: monthly and annual Premium subscriptions. Optional donations can support Free users only after a real payment workflow exists. Team plans, storage add-ons or paid templates are future ideas, not implemented features or confirmed prices.

Let M = monthly subscribers, Y = annual subscribers, F = free users, and D = actual collected donations. Monthly-equivalent gross subscription revenue is 49M + (499/12)Y. Cash receipts depend on actual billing dates and renewals. Contribution margin must subtract payment processing, refunds, applicable taxes, hosting, database/storage/egress, support and monitoring costs. Use measured costs; no provider fee or tax rate is assumed here. Track conversion, active usage, churn, refund rate, average revenue per paying account, storage/egress per account, and support cost. Never populate the admin dashboard with fictional subscriber counts, storage percentages or revenue.

## Public launch prerequisites

1. Reintroduce a reviewed multi-tenant authorization model: identity, tenant membership, project ownership and server-enforced entitlements.
2. Replace the owner-only signup guard with a supported reviewed public onboarding flow. Do not merely remove the frontend owner check.
3. Restore collaboration RPCs and RLS only after cross-tenant tests pass. Never grant all authenticated users access to all projects.
4. Choose and verify a payment provider at implementation time; create orders and verify payment/webhook signatures on the server. Never ship a service-role key or payment secret in browser code.
5. Make entitlement changes idempotent and driven by verified provider events. Handle duplicate/out-of-order webhooks, failed renewals, cancellations, expiry, refunds and disputes.
6. Implement billing history, receipts, cancellation and refund workflows with clear supported policies. Obtain the required business/legal/accounting review before publication.
7. Enforce plan limits and quotas server-side, including export/backup reliability and optimized media limits. A paywall in HTML is not authorization.
8. Provide verified capacity/usage values. Treat unavailable provider capacity as unknown, not zero or an invented percentage.
9. Test Free/Premium/expired/subscription-error flows and RLS under anonymous, owner, member and unrelated-account contexts.
10. Restore public pricing, marketing, signup, upgrade and donation UI only when the corresponding backend is actually operational.

## Resources and exact recovery baseline

Repository: https://github.com/AKHILREDDY7841/PreFrame
Commercial baseline commit: d5974f8e60e00c3c7341e70ea6108f3aa0cf126a.

Source resources at that revision: src/landing-content.ts (marketing/pricing), src/home-content.ts (tier dashboards and notices), src/collaboration-page.ts (invitations/codes), src/app.ts (route gates/dialogs), src/tool-ui.ts (shot/frame caps), src/cloud.ts (RPC wrappers), src/domain.ts (tiers/roles), styles.css and studio.css (branding/layout), and supabase/migrations/202609260011_premium_and_recycle_bin.sql plus 202609260012_owner_admin_unlimited.sql (server gates and administrator identity).

Recover a source resource in a separate branch using git show d5974f8:path/to/file. Do not blindly roll the whole app or database back to that revision: later fixes and private-mode restrictions need a reviewed migration. Existing enum values and old migration history can remain for compatibility; they must not accidentally reactivate public access.

Official implementation references: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/database/functions ; https://supabase.com/docs/guides/auth/managing-user-data . Verify current payment-provider documentation and account eligibility when implementing billing.

## Preserved pricing and marketing source

The following exact source is preserved for later adaptation. It is dormant in the private product, not a live offer.

```typescript
export function landingDetails(authPath: string): string {
  return `<section id="features" class="story-section feature-section" aria-labelledby="features-title">
    <div class="story-inner">
      <div class="section-rule" data-reveal><span>01 / THE WORKSPACE</span><span>FROM IDEA TO ACTION</span></div>
      <div class="feature-intro" data-reveal>
        <div><p class="section-eyebrow">EVERY FRAME BEGINS BEFORE THE CAMERA</p><h2 id="features-title">One story.<br><em>Every step</em> before the set.</h2></div>
        <p>Keep the thinking, writing, and planning around a film in one place. Move from a first line to a shared plan without losing the thread of the story.</p>
      </div>
      <div class="feature-showcase">
        <div class="feature-art" role="img" aria-label="Cinematic film frames across a misty landscape" data-reveal><span class="feature-art-index">PREFRAME / 01</span><span class="feature-art-quote">All great films<br>start here.</span><span class="feature-art-bottom">A WORKSPACE FOR THE WORK BEFORE PRODUCTION</span></div>
        <div class="feature-chapters">
          <article data-reveal><span class="chapter-number">01</span><div><h3>Write</h3><p>Give screenplays and notes a place to grow with your project.</p></div><span class="chapter-arrow" aria-hidden="true">↗</span></article>
          <article data-reveal><span class="chapter-number">02</span><div><h3>Visualize</h3><p>See scenes in shot lists and storyboard frames before the day of the shoot.</p></div><span class="chapter-arrow" aria-hidden="true">↗</span></article>
          <article data-reveal><span class="chapter-number">03</span><div><h3>Plan</h3><p>Bring schedules, locations, and call sheets into the same story.</p></div><span class="chapter-arrow" aria-hidden="true">↗</span></article>
          <article data-reveal><span class="chapter-number">04</span><div><h3>Collaborate</h3><p>Make room for the people who help turn an idea into a production.</p></div><span class="chapter-arrow" aria-hidden="true">↗</span></article>
        </div>
      </div>
    </div>
  </section>
  <section id="pricing" class="story-section pricing-section" aria-labelledby="pricing-title">
    <div class="story-inner">
      <div class="section-rule" data-reveal><span>02 / PRICING</span><span>YOUR STORY, YOUR PACE</span></div>
    <div class="pricing-intro" data-reveal><div><p class="section-eyebrow">START WITH THE IDEA</p><h2 id="pricing-title">Make room for<br><em>what comes next.</em></h2></div><p>Begin for free. Choose the Premium billing period that fits your work: ₹49 per month or ₹499 per year.</p></div>
      <div class="pricing-grid">
        <article class="price-card" data-reveal><div class="price-card-top"><span>THE FIRST FRAME</span><span>01</span></div><h3>Free</h3><p class="price-value">₹0</p><p class="price-term">No subscription</p><div class="price-divider"></div><p class="price-description">One active owned project, up to three members including the owner, 50 active shots, and 50 storyboard frames.</p><a class="price-action" href="${authPath}" data-route>Start for free <span aria-hidden="true">↗</span></a></article>
        <article class="price-card price-card-accent" data-reveal><div class="price-card-top"><span>FLEXIBLE CREATION</span><span>02</span></div><h3>Premium Monthly</h3><p class="price-value">₹49 <small>/ month</small></p><p class="price-term">₹49 billed monthly</p><div class="price-divider"></div><p class="price-description">Premium access with a monthly billing period.</p><span class="price-unavailable">Premium checkout coming soon</span></article>
        <article class="price-card price-card-annual" data-reveal><div class="price-card-top"><span>THE LONG VIEW</span><span>03</span></div><h3>Premium Annual</h3><p class="price-value">₹499 <small>/ year</small></p><p class="price-term">₹499 billed yearly</p><div class="price-divider"></div><p class="price-description">Premium access for the year at one clear rate.</p><span class="price-unavailable">Premium checkout coming soon</span></article>
      </div>
      <p class="pricing-note" data-reveal>Premium checkout is not available yet. The displayed rates do not start a subscription.</p>
    </div>
  </section>
  <section id="about" class="story-section about-section" aria-labelledby="about-title">
    <div class="about-image" aria-hidden="true"></div>
    <div class="story-inner about-inner">
      <div class="section-rule" data-reveal><span>03 / ABOUT PREFRAME</span><span>BUILT FOR FILMMAKERS</span></div>
      <div class="about-copy" data-reveal><p class="section-eyebrow">BEFORE THE CAMERA ROLLS</p><h2 id="about-title">Ideas are easy.<br><em>Making them real</em><br>takes a plan.</h2><p>Preframe is an evolving home for the work that happens before production: the pages, images, decisions, and people behind every frame.</p></div>
      <div class="about-footer" data-reveal><span>WRITE&nbsp; / &nbsp;VISUALIZE&nbsp; / &nbsp;PLAN&nbsp; / &nbsp;COLLABORATE</span><a href="${authPath}" data-route>Start your story <span aria-hidden="true">↗</span></a></div>
    </div>
  </section>`;
}

```

## Preserved collaboration source

```typescript
import type { Project } from './domain.js';
import { supabase } from './cloud.js';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export function collaborationPage(projects:Project[], href:(s:string)=>string, preview:boolean):string {
  return `<main class="collaboration-page"><p class="eyebrow">CREATE TOGETHER</p><h1>Collaborate</h1><p>Bring your crew into a project, or join a story already in motion.</p><div class="collaboration-choices"><button id="choose-invite" type="button"><strong>Invite a teammate</strong><span>Create a six-character code for your project.</span></button><button id="choose-join" type="button"><strong>Join a project</strong><span>Enter the code your project owner shared.</span></button></div><section id="invite-code-panel" hidden><h2>Invite a teammate</h2><p>The code grants an editor seat. It expires after 60 seconds and can be used once. Creating another code replaces the previous one.</p><form id="generate-code"><label>Project<select name="project" required>${projects.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select></label><button ${!projects.length||preview?'disabled':''} type="submit">Generate invite code</button></form>${!projects.length?'<p>Create a project first to invite teammates.</p>':''}<div id="generated-code" hidden><output></output><button type="button" id="copy-code">Copy code</button><p id="code-expiry" aria-live="off"></p><button type="button" id="resend-code" hidden>Generate a new code</button></div></section><section id="join-code-panel" hidden><h2>Join a project</h2><form id="join-code"><label>Invite code<input name="code" maxlength="6" minlength="6" pattern="[A-Za-z0-9]{6}" placeholder="A7K2M9" autocomplete="off" autocapitalize="characters" required></label><button type="submit" ${preview?'disabled':''}>Join project</button></form></section><p role="status" id="collaboration-status">${preview?'Sign in to invite teammates or join a project.':''}</p><p class="collaboration-note">Signed-in project documents sync to the cloud. Local preview stays in this browser. Invite codes require the collaboration service.</p></main>`;
}
export function wireCollaboration(href:(s:string)=>string, navigate:(s:string)=>void):void {
  const status=document.querySelector<HTMLElement>('#collaboration-status')!;
  for(const mode of ['invite','join']) document.querySelector(`#choose-${mode}`)?.addEventListener('click',()=>{document.querySelector<HTMLElement>('#invite-code-panel')!.hidden=mode!=='invite';document.querySelector<HTMLElement>('#join-code-panel')!.hidden=mode!=='join';});
  const run=async(form:HTMLFormElement,work:()=>Promise<void>)=>{const button=form.querySelector<HTMLButtonElement>('button')!;button.disabled=true;status.textContent='Working…';try{await work();}catch(error){status.textContent=error instanceof Error?error.message:'Please try again.';}finally{button.disabled=false;}};
  let countdown: ReturnType<typeof setInterval> | undefined;
  const generate=document.querySelector<HTMLFormElement>('#generate-code')!;
  generate.onsubmit=event=>{event.preventDefault();void run(generate,async()=>{const {data,error}=await supabase.rpc('generate_project_code',{p_project:String(new FormData(generate).get('project'))});if(error)throw new Error(error.code==='PGRST202'?'Invite codes are awaiting server setup. Please try again later.':error.message);const panel=document.querySelector<HTMLElement>('#generated-code')!;panel.hidden=false;panel.querySelector('output')!.textContent=data.code;clearInterval(countdown); const expiry=Date.parse(data.expiresAt); const resend=document.querySelector<HTMLButtonElement>("#resend-code")!; const copy=document.querySelector<HTMLButtonElement>("#copy-code")!; resend.hidden=true;copy.disabled=false; const tick=()=>{if(!panel.isConnected){clearInterval(countdown);return;}const seconds=Math.max(0,Math.ceil((expiry-Date.now())/1000));document.querySelector("#code-expiry")!.textContent=seconds ? `Expires in ${seconds} seconds` : "This code has expired.";if(!seconds){clearInterval(countdown);resend.hidden=false;copy.disabled=true;}};tick();countdown=setInterval(tick,1000);status.textContent='Share this code with the teammate you want to invite.';});};
  document.querySelector("#resend-code")?.addEventListener("click",()=>generate.requestSubmit());
  const join=document.querySelector<HTMLFormElement>('#join-code')!;
  join.onsubmit=event=>{event.preventDefault();void run(join,async()=>{const {data,error}=await supabase.rpc('join_project_code',{p_code:String(new FormData(join).get('code')).trim().toUpperCase()});if(error)throw new Error(error.code==='PGRST202'?'Invite codes are awaiting server setup. Please try again later.':error.message);if(data.error)throw new Error(data.error);navigate(href(`/app/projects/${data.projectId}`));});};
  document.querySelector('#copy-code')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(document.querySelector('#generated-code output')!.textContent!);status.textContent='Code copied.';}catch{status.textContent='Select and copy the code shown above.';}});
}

```
