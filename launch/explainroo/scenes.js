export default {
  // Beat 1: Hook (0-4s) - Fragmentation to Unified Danikuse
  hook(s) {
    const { top, h, w, left } = s.safe;
    const u = Math.min(w, h) / 100;

    // Header title and subtitle
    s.title('Danikuse', { y: top + h * 0.16, size: u * 9, at: -1 });
    s.text('AI Browser & Desktop Automation', { y: top + h * 0.27, size: u * 3.8, color: 'muted', at: -1 });

    // Scattered driver cards
    const cardY = top + h * 0.52;
    const cardW = w * 0.20;

    // Left fragments
    s.box('agent-browser', {
      id: 'driver1',
      x: left + w * 0.14,
      y: cardY - u * 6,
      w: cardW,
      size: u * 3.5,
      icon: 'globe',
      color: 'blue',
      at: -1,
      out: '#unify',
    });

    s.box('Playwright CDP', {
      id: 'driver2',
      x: left + w * 0.14,
      y: cardY + u * 10,
      w: cardW,
      size: u * 3.5,
      icon: 'cpu',
      color: 'purple',
      at: -1,
      out: '#unify',
    });

    // Right fragments
    s.box('agent-desktop', {
      id: 'driver3',
      x: left + w * 0.86,
      y: cardY - u * 6,
      w: cardW,
      size: u * 3.5,
      icon: 'monitor',
      color: 'teal',
      at: -1,
      out: '#unify',
    });

    s.box('Firecrawl scraper', {
      id: 'driver4',
      x: left + w * 0.86,
      y: cardY + u * 10,
      w: cardW,
      size: u * 3.5,
      icon: 'layers',
      color: 'orange',
      at: -1,
      out: '#unify',
    });

    // Middle fragmented label
    s.text('Fragmented drivers and scrapers', {
      x: s.cx,
      y: cardY + u * 2,
      size: u * 4.2,
      color: 'muted',
      at: 0.5,
      out: '#unify',
    });

    // Unified Danikuse card revealed at #unify
    const unifiedCard = s.box('One Command: danikuse', {
      id: 'unified',
      x: s.cx,
      y: top + h * 0.56,
      w: w * 0.55,
      size: u * 5.5,
      icon: 'terminal',
      color: 'accent',
      at: '#unify',
    });

    s.text('Unified surface split + single safety model + verifiable JSON evidence', {
      x: s.cx,
      y: unifiedCard.bottom + u * 5,
      size: u * 3.2,
      color: 'ink',
      at: '#unify',
    });
  },

  // Beat 2: Engines (4-9s) - Automation Profile vs Personal Brave Bridge
  engines(s) {
    const { top, h, w, left } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('Two Distinct Browser Engines', { y: top + h * 0.15, size: u * 7.5, at: -1 });

    const colW = w * 0.44;
    const colY = top + h * 0.54;

    // Left Column: Automation Browser
    const autoBox = s.box('Automation Browser', {
      id: 'autoBox',
      x: left + w * 0.26,
      y: colY - u * 12,
      w: colW,
      size: u * 4.5,
      icon: 'bot',
      color: 'teal',
      at: '#auto',
    });

    s.text('Lightweight separate Brave profile (~10 MB)', {
      x: left + w * 0.26,
      y: autoBox.bottom + u * 4,
      size: u * 3.2,
      color: 'muted',
      maxWidth: colW,
      at: '#auto',
    });

    s.box('Clean Profile: ~/.danikuse/automation-profile\nFast daily runs, headed or hidden background', {
      x: left + w * 0.26,
      y: autoBox.bottom + u * 15,
      w: colW * 0.95,
      size: u * 2.8,
      color: 'surface',
      at: '#auto',
    });

    // Right Column: Personal Brave Bridge
    const persBox = s.box('Personal Brave Bridge', {
      id: 'persBox',
      x: left + w * 0.74,
      y: colY - u * 12,
      w: colW,
      size: u * 4.5,
      icon: 'shield-check',
      color: 'orange',
      at: '#personal',
    });

    s.text('Direct connection to your live Brave window', {
      x: left + w * 0.74,
      y: persBox.bottom + u * 4,
      size: u * 3.2,
      color: 'muted',
      maxWidth: colW,
      at: '#personal',
    });

    s.box('Extension Bridge + Native Host\nNo restart required - No debug port left open', {
      x: left + w * 0.74,
      y: persBox.bottom + u * 15,
      w: colW * 0.95,
      size: u * 2.8,
      color: 'surface',
      at: '#personal',
    });
  },

  // Beat 3: Safety Model (9-14s) - Confirm Mode & Hard Stop
  safety(s) {
    const { top, h, w, left } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('Strict Safety Architecture', { y: top + h * 0.15, size: u * 7.5, at: -1 });

    const cardW = w * 0.44;
    const cardY = top + h * 0.54;

    // Confirm Mode Card
    const confirmCard = s.box('Confirm Mode', {
      id: 'confirmCard',
      x: left + w * 0.26,
      y: cardY - u * 10,
      w: cardW,
      size: u * 4.5,
      icon: 'check-circle-2',
      color: 'green',
      at: '#confirm',
    });

    s.text('Read & extract navigate freely.\nMutating actions pause and ask before execution.', {
      x: left + w * 0.26,
      y: confirmCard.bottom + u * 6,
      size: u * 3.2,
      color: 'ink',
      maxWidth: cardW * 0.9,
      at: '#confirm',
    });

    s.box('FREE: Read text, inspect DOM, take screenshot\nCONFIRM: Form submit, publish, file write', {
      x: left + w * 0.26,
      y: confirmCard.bottom + u * 18,
      w: cardW * 0.95,
      size: u * 2.8,
      color: 'surface',
      at: '#confirm',
    });

    // Hard Stop Card
    const hardCard = s.box('HARD STOP', {
      id: 'hardCard',
      x: left + w * 0.74,
      y: cardY - u * 10,
      w: cardW,
      size: u * 4.5,
      icon: 'ban',
      color: 'red',
      at: '#hardstop',
    });

    s.text('Immediate halt on sensitive operations.\nNo autonomous bypass in any mode.', {
      x: left + w * 0.74,
      y: hardCard.bottom + u * 6,
      size: u * 3.2,
      color: 'red',
      maxWidth: cardW * 0.9,
      at: '#hardstop',
    });

    s.box('BLOCKED: Payment & credit card inputs\nBLOCKED: Passwords & 2FA token entry\nBLOCKED: Irreversible account deletion', {
      x: left + w * 0.74,
      y: hardCard.bottom + u * 18,
      w: cardW * 0.95,
      size: u * 2.8,
      color: 'surface',
      at: '#hardstop',
    });
  },

  // Beat 4: Verifiable Evidence (14-17s) - Benchmark & JSON Contract
  benchmark(s) {
    const { top, h, w, left } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('Verifiable Execution Evidence', { y: top + h * 0.15, size: u * 7.5, at: -1 });

    const paneW = w * 0.44;
    const paneY = top + h * 0.54;

    // Terminal with benchmark output
    s.terminal([
      { cmd: 'npm run benchmark' },
      '[1/5] form_fill ........... PASS (380ms)',
      '[2/5] extract_structured ... PASS (240ms)',
      '[3/5] dev_loop_screenshot . PASS (410ms)',
      '[4/5] desktop_action ...... PASS (310ms)',
      '[5/5] personal_draft ...... PASS (190ms)',
      'Benchmark report: 5 of 5 tasks PASSED',
    ], {
      x: left + w * 0.26,
      y: paneY + u * 2,
      w: paneW,
      size: u * 2.6,
      title: 'PowerShell - Danikuse Benchmark',
      at: '#bench',
    });

    // JSON Contract Box
    s.code('{\n  "status": "ok",\n  "browser": "brave",\n  "action": "extract",\n  "screenshot": "runs/005/snap.png",\n  "durationMs": 1530,\n  "runDir": ".danikuse/runs/005"\n}', {
      x: left + w * 0.74,
      y: paneY - u * 5,
      w: paneW,
      lang: 'json',
      title: 'response-contract.json',
      size: u * 2.5,
      at: '#bench',
    });

    s.box('No evidence, no done.', {
      x: left + w * 0.74,
      y: paneY + u * 23,
      color: 'green',
      size: u * 3.2,
      icon: 'check-circle-2',
      at: '#evidence',
    });
  },

  // Beat 5: Install & CTA (17-20s) - PowerShell command + Apache-2.0
  install(s) {
    const { top, h, w, left } = s.safe;
    const u = Math.min(w, h) / 100;

    s.title('Install Danikuse', { y: top + h * 0.18, size: u * 8.5, at: -1 });

    // PowerShell install command terminal
    s.terminal([
      { cmd: './install.ps1' },
      'Installing Danikuse CLI and Bridge...',
      'Automation profile: ~/.danikuse/automation-profile',
      'Danikuse installed: danikuse is on PATH',
    ], {
      x: s.cx,
      y: top + h * 0.48,
      w: w * 0.68,
      size: u * 3.0,
      title: 'PowerShell 7 (Windows)',
      at: '#cli',
    });

    // Badges and GitHub link
    s.box('Apache-2.0 License', {
      x: left + w * 0.32,
      y: top + h * 0.78,
      color: 'green',
      size: u * 3.5,
      icon: 'check',
      at: '#cta',
    });

    s.box('github.com/dancho133/danikuse', {
      x: left + w * 0.68,
      y: top + h * 0.78,
      size: u * 3.5,
      icon: 'folder-git-2',
      color: 'accent',
      at: '#cta',
    });
  },
};
