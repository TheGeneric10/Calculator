// public/js/description.js
window.CALC_APP = window.CALC_APP || {};

/**
 * 1.0.0 (Official Release)
 * - Intro loading overlay (favicon centered)
 * - Touch glide typing + better multi-touch feel
 * - Click sounds (assets/sounds/click.ogg) with overlap
 * - Dialog animation reliability improvements
 */
window.CALC_APP.WHATS_NEW_HTML = `
  <div style="font-weight:600;margin-bottom:10px;">Last Updated: February 2026</div>
  <div style="font-weight:600;margin-bottom:6px;">What's New?</div>

  <div style="margin-bottom:10px;">
    <div style="font-weight:600;">1.0.0 (Feb 2026) — <span style="color:#ffd54a;">Official Release</span></div>
    <ul style="margin:6px 0 10px 18px;padding:0;">
      <li>Official public release build</li>
      <li>Intro loading screen (favicon overlay)</li>
      <li>Touchscreen glide typing (drag across keys)</li>
      <li>Button click sounds: <span style="color:#ffd54a;">assets/sounds/click.ogg</span> (supports overlap)</li>
      <li>Dialog popup animations more consistent when chaining</li>
    </ul>

    <div style="font-weight:600;">0.8.0 (Feb 2026)</div>
    <ul style="margin:6px 0 10px 18px;padding:0;">
      <li>Dialog timing reverted (less gap between popups)</li>
      <li>Removed extra hint text lines in confirm popups</li>
      <li>Disabled dragging + text highlighting (only display can be selected)</li>
    </ul>

    <div style="font-weight:600;">0.7.0 (Feb 2026)</div>
    <ul style="margin:6px 0 10px 18px;padding:0;">
      <li>Scientific typing stays short: <span style="color:#ffd54a;">2.4e14 + 33</span></li>
      <li>History shows scientific expressions correctly</li>
      <li>On upgrade, auto shows What's New → NOTICE</li>
      <li>Saved Data = localStorage (history + settings)</li>
      <li>Cache Data = temporary CacheStorage</li>
      <li>Clear Cache clears ONLY cache</li>
      <li>Clear Saved Data clears ONLY history</li>
      <li>Reset Settings button with confirmation</li>
    </ul>
  </div>
`;

window.CALC_APP.NOTICE_HTML = `
  <div style="line-height:1.35;">
    <div style="font-weight:700;margin-bottom:8px;color:#ffffff;">NOTICE</div>

    <div style="color:#ffd54a;margin-bottom:8px;">
      • This is the official release build (1.0.0). Features may still evolve.
    </div>

    <div style="color:#ffffff;margin-bottom:8px;">
      • Upgrading keeps your saved data. Downgrading resets for safety.
    </div>

    <div style="color:#ff5252;margin-bottom:8px;">
      • Clear Cache removes temporary cache only. Clear Saved Data removes history only.
    </div>

    <div style="color:#ffffff;">
      • Scientific typing stays short (example: <span style="color:#ffd54a;">2.4e14 + 33</span>).
    </div>
  </div>
`;

window.CALC_APP.INFINITY_HTML = `
  <div style="line-height:1.35;">
    <div style="font-weight:700;color:#ffffff;margin-bottom:8px;">Infinity!</div>
    <div style="color:#dedede;margin-bottom:10px;">
      In mathematics, there is no maximum number before infinity because numbers go on forever.
      Infinity is a concept or a limit, not a specific number.
    </div>

    <div style="color:#ffd54a;font-weight:600;margin-bottom:6px;">
      Commonly cited huge finite numbers:
    </div>
    <ul style="margin:6px 0 10px 18px;padding:0;color:#ffffff;">
      <li>Googolplex (10^(googol) or 10^(10^100))</li>
      <li>Googolplexian (10^(googolplex))</li>
      <li>Rayo's Number</li>
      <li>Graham's Number</li>
    </ul>

    <div style="color:#ffffff;margin-bottom:6px;font-weight:600;">Key Mathematical Facts:</div>
    <ul style="margin:6px 0 0 18px;padding:0;color:#dedede;">
      <li>10^infinity is Infinity: any power of 10 is still finite.</li>
      <li>Adding to Infinity: infinity + 1 = infinity (in transfinite arithmetic).</li>
      <li>Observable universe atoms: about 10^80 to 10^82.</li>
    </ul>
  </div>
`;
