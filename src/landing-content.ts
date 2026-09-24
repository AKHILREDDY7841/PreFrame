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
      <div class="pricing-intro" data-reveal><div><p class="section-eyebrow">START WITH THE IDEA</p><h2 id="pricing-title">Make room for<br><em>what comes next.</em></h2></div><p>Begin for free. Premium introductory prices and their recurring renewal prices are shown together, so the next bill is clear before you choose a plan.</p></div>
      <div class="pricing-grid">
        <article class="price-card" data-reveal><div class="price-card-top"><span>THE FIRST FRAME</span><span>01</span></div><h3>Free</h3><p class="price-value">₹0</p><p class="price-term">No subscription</p><div class="price-divider"></div><p class="price-description">One active owned project, up to three members including the owner, 50 active shots, and 50 storyboard frames.</p><a class="price-action" href="${authPath}" data-route>Start for free <span aria-hidden="true">↗</span></a></article>
        <article class="price-card price-card-accent" data-reveal><div class="price-card-top"><span>FLEXIBLE CREATION</span><span>02</span></div><h3>Premium Monthly</h3><p class="price-value">₹149 <small>/ first month</small></p><p class="price-term">Then <strong>₹199/month</strong> on renewal</p><div class="price-divider"></div><p class="price-description">An introductory first month, followed by recurring monthly billing at the stated renewal price.</p><span class="price-unavailable">Premium checkout coming soon</span></article>
        <article class="price-card price-card-annual" data-reveal><div class="price-card-top"><span>THE LONG VIEW</span><span>03</span></div><h3>Premium Annual</h3><div class="annual-offer"><span>LAUNCH-PERIOD OFFER</span><p><strong>₹999</strong> first year</p><small>For new subscribers in the first 30 days after the confirmed public launch.</small></div><div class="annual-offer"><span>STANDARD NEW-USER OFFER</span><p><strong>₹1,199</strong> first year</p><small>For new subscribers after the launch period.</small></div><p class="annual-renewal">Both renew at <strong>₹1,499/year</strong> after the first year.</p><span class="price-unavailable">Premium checkout coming soon</span></article>
      </div>
      <p class="pricing-note" data-reveal>The public launch date is not confirmed, so the launch-period offer is not active yet. Premium checkout is not available yet.</p>
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
