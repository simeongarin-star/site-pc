/* =================================================================
   HÉLIX — Logique du composant
   Chargé dans le <head>. On expose une fabrique : le runtime DC nous
   passe sa classe de base `DCLogic` au démarrage, on renvoie la classe
   du composant. Ça garde la logique (ce fichier) séparée de la
   structure (Helix.dc.html) et des styles (Helix.css).
   ================================================================= */
window.createHelixComponent = function (DCLogic) {
  return class Component extends DCLogic {
    // État local de l'interface
    state = { revealed: false, quoteOpen: false, quoteSent: false, quoteError: null, quoteSending: false };

    // Déclinaisons d'accent : couleur hex (CSS), halo, et RGB (pour le canvas)
    accentMap = {
      cyan:     { hex: '#3fe1ff', glow: 'rgba(63,225,255,0.45)',  rgb: { r: 63,  g: 225, b: 255 } },
      electric: { hex: '#5a7dff', glow: 'rgba(90,125,255,0.50)',  rgb: { r: 90,  g: 125, b: 255 } },
      ice:      { hex: '#b9e2ff', glow: 'rgba(185,226,255,0.42)', rgb: { r: 185, g: 226, b: 255 } },
    };

    // Accent courant (selon la prop), avec repli sur cyan
    accent() { return this.accentMap[this.props.accent] || this.accentMap.cyan; }

    // --- Cycle de vie ---
    componentDidMount() {
      this.applyAccent();
      document.body.style.overflow = 'hidden';
      // Si l'utilisateur a demandé « animations réduites », on saute l'intro animée.
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.finishIntro();
        return;
      }
      requestAnimationFrame(() => this.startIntro());
    }
    componentDidUpdate(prev) {
      if (prev.accent !== this.props.accent) this.applyAccent();
    }
    componentWillUnmount() {
      cancelAnimationFrame(this.raf);
      if (this._resize) window.removeEventListener('resize', this._resize);
      document.body.style.overflow = '';
    }

    // Injecte la couleur d'accent choisie dans les variables CSS du conteneur racine
    applyAccent() {
      const a = this.accent();
      if (this.root) {
        this.root.style.setProperty('--accent', a.hex);
        this.root.style.setProperty('--glow', a.glow);
      }
    }

    // --- Animation d'intro (canvas plein écran) ---
    startIntro() {
      const canvas = this.canvasRef;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const motion = this.props.introMotion || 'vortex';
      const rgb = this.accent().rgb;
      let dpr, W, H, cx, cy, R;
      // Recalcule les dimensions du canvas (et au redimensionnement)
      const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        cx = W / 2; cy = H / 2; R = Math.min(W, H) * 0.33;
      };
      resize(); this._resize = resize; window.addEventListener('resize', resize);

      // Génère les particules aspirées vers le centre
      const N = motion === 'calme' ? 70 : 150;
      const parts = [];
      const spawn = (p) => {
        p.ang = Math.random() * Math.PI * 2;
        p.rad = R * (1.25 + Math.random() * 2.6);
        p.w = 0.6 + Math.random() * 1.9;
        p.spin = 0.4 + Math.random() * 0.9;
      };
      for (let i = 0; i < N; i++) { const p = {}; spawn(p); p.rad = R * (0.25 + Math.random() * 3.2); parts.push(p); }

      let angle = 0;
      const start = performance.now();
      this._last = start;
      const DUR = motion === 'calme' ? 3.0 : 2.65;   // durée totale (s)
      const FADE_AT = DUR - 0.3;                       // début du flash final

      // Boucle de rendu image par image
      const loop = (now) => {
        const t = (now - start) / 1000;
        const p = Math.min(t / DUR, 1);
        const dt = Math.min((now - this._last) / 1000, 0.05);
        this._last = now;

        // accélération angulaire
        const omega = 1.6 + (motion === 'calme' ? 14 : 75) * Math.pow(p, 2.3);
        angle += omega * dt;

        // courbe de zoom (varie selon le type de mouvement)
        let z;
        if (motion === 'warp') { z = 1 + Math.pow(p, 2.1) * 24; }
        else if (motion === 'calme') { z = 1 + 0.16 * p; }
        else { if (t < 1.85) z = 1 + 0.2 * (t / 1.85); else { const k = Math.min((t - 1.85) / (DUR - 1.85), 1); z = 1.2 + Math.pow(k, 2.7) * 17; } }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        const clearA = motion === 'calme' ? 0.5 : (0.52 - 0.42 * p);
        ctx.fillStyle = 'rgba(7,10,18,' + clearA + ')';
        ctx.fillRect(0, 0, W, H);

        // traînées des particules attirées vers le centre
        ctx.globalCompositeOperation = 'lighter';
        const suck = (motion === 'calme' ? 0.55 : 1) * (0.5 + 5.5 * Math.pow(p, 1.6));
        const tail = R * 0.1 * (0.4 + 3.4 * p);
        for (const pt of parts) {
          pt.rad -= (pt.rad * 0.55 + R * 0.22) * suck * dt * 0.17;
          pt.ang += pt.spin * (0.6 + 4.2 * p) * dt;
          if (pt.rad < R * 0.15) spawn(pt);
          const ca = Math.cos(pt.ang), sa = Math.sin(pt.ang);
          const x = cx + ca * pt.rad, y = cy + sa * pt.rad;
          const ox = cx + ca * (pt.rad + tail), oy = cy + sa * (pt.rad + tail);
          const a = Math.max(0, Math.min(1, (R * 2.6 - pt.rad) / (R * 2.6))) * 0.78;
          ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + a + ')';
          ctx.lineWidth = pt.w;
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x, y); ctx.stroke();
        }

        // ventilateur central (tourne + zoome)
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(z, z); ctx.rotate(angle);
        this.drawFan(ctx, R);
        ctx.restore();

        // halo central grandissant (le « cœur » de la spirale)
        ctx.globalCompositeOperation = 'lighter';
        const gR = R * (0.22 + Math.min(z, 8) * 0.12);
        const ga = Math.min(0.92, 0.12 + 0.9 * Math.pow(Math.max(0, (t - 1.5) / (DUR - 1.5)), 1.4));
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
        g.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + ga + ')');
        g.addColorStop(0.45, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (ga * 0.4) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, gR, 0, 7); ctx.fill();

        // flash blanc final avant de révéler la page
        if (t > FADE_AT) {
          const f = Math.min((t - FADE_AT) / 0.3, 1);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(248,251,255,' + f + ')';
          ctx.fillRect(0, 0, W, H);
        }

        if (t < DUR) this.raf = requestAnimationFrame(loop);
        else this.finishIntro();
      };
      this.raf = requestAnimationFrame(loop);
    }

    // Dessine le ventilateur : anneau, pales, moyeu, centre
    drawFan(ctx, R) {
      const N = 9, innerR = R * 0.19, outerR = R;
      // anneau de cadre, discret
      ctx.lineWidth = R * 0.012;
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath(); ctx.arc(0, 0, outerR * 1.04, 0, 7); ctx.stroke();
      // pales
      for (let i = 0; i < N; i++) {
        ctx.save();
        ctx.rotate((i / N) * Math.PI * 2);
        const grad = ctx.createLinearGradient(innerR, 0, outerR, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0.72)');
        grad.addColorStop(1, 'rgba(255,255,255,0.96)');
        ctx.fillStyle = grad;
        const w1 = R * 0.055, w2 = R * 0.17;
        ctx.beginPath();
        ctx.moveTo(innerR, -w1);
        ctx.quadraticCurveTo(outerR * 0.55, -w2 * 1.5, outerR * 0.98, -w2 * 0.12);
        ctx.quadraticCurveTo(outerR * 1.01, 0, outerR * 0.95, w2 * 0.55);
        ctx.quadraticCurveTo(outerR * 0.5, w2 * 1.25, innerR, w1);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // moyeu central
      const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR * 1.3);
      hg.addColorStop(0, 'rgba(255,255,255,0.96)');
      hg.addColorStop(0.7, 'rgba(228,234,245,0.9)');
      hg.addColorStop(1, 'rgba(170,182,200,0.55)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(0, 0, innerR * 1.28, 0, 7); ctx.fill();
      // trou central
      ctx.fillStyle = 'rgba(8,12,22,0.92)';
      ctx.beginPath(); ctx.arc(0, 0, innerR * 0.5, 0, 7); ctx.fill();
    }

    // Fin de l'intro : on révèle la page (dézoom + défloutage) et on masque le canvas
    finishIntro() {
      cancelAnimationFrame(this.raf);
      const canvas = this.canvasRef, home = this.homeRef;
      if (home) { home.style.transform = 'scale(1)'; home.style.filter = 'none'; }
      if (canvas) {
        canvas.style.transition = 'opacity .6s ease';
        canvas.style.opacity = '0';
        setTimeout(() => {
          if (canvas) canvas.style.display = 'none';
          if (this._resize) { window.removeEventListener('resize', this._resize); this._resize = null; }
        }, 700);
      }
      document.body.style.overflow = '';
      this.setState({ revealed: true });
    }

    // --- Interactions UI ---
    // Défile en douceur jusqu'à la section Réalisations
    scrollWork = (e) => {
      if (e) e.preventDefault();
      const el = this.workRef;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    };
    openQuote = () => this.setState({ quoteOpen: true, quoteSent: false, quoteError: null });
    closeQuote = () => this.setState({ quoteOpen: false });
    stop = (e) => { e.stopPropagation(); };   // empêche la fermeture quand on clique dans la modale

    submitQuote = async () => {
      const nom    = this.fieldNom?.value?.trim()    || '';
      const email  = this.fieldEmail?.value?.trim()  || '';
      const buildType = this.fieldBuild?.value       || '';
      const budget = this.fieldBudget?.value         || '';
      const projet = this.fieldProjet?.value?.trim() || '';

      if (!nom || !email || !projet) {
        this.setState({ quoteError: 'Merci de remplir au moins votre nom, email et description du projet.' });
        return;
      }

      this.setState({ quoteSending: true, quoteError: null });
      try {
        const res = await fetch('/api/devis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom, email, buildType, budget, projet }),
        });
        const data = await res.json();
        if (res.ok) {
          this.setState({ quoteSent: true, quoteSending: false });
        } else {
          this.setState({ quoteError: data.error || 'Une erreur est survenue.', quoteSending: false });
        }
      } catch {
        this.setState({ quoteError: 'Impossible de joindre le serveur. Réessayez plus tard.', quoteSending: false });
      }
    };

    // Valeurs exposées au template (refs, handlers, données)
    renderVals() {
      const layout = this.props.heroLayout || 'centre';
      return {
        setRoot: el => { this.root = el; },
        setHome: el => { this.homeRef = el; },
        setCanvas: el => { this.canvasRef = el; },
        setWork: el => { this.workRef = el; },
        setFieldNom:    el => { this.fieldNom    = el; },
        setFieldEmail:  el => { this.fieldEmail  = el; },
        setFieldBuild:  el => { this.fieldBuild  = el; },
        setFieldBudget: el => { this.fieldBudget = el; },
        setFieldProjet: el => { this.fieldProjet = el; },
        heroCentre: layout === 'centre',
        heroSplit: layout === 'split',
        quoteOpen: this.state.quoteOpen,
        quoteForm: this.state.quoteOpen && !this.state.quoteSent,
        quoteSent: this.state.quoteSent,
        quoteError: this.state.quoteError,
        quoteSending: this.state.quoteSending,
        scrollWork: this.scrollWork,
        openQuote: this.openQuote,
        closeQuote: this.closeQuote,
        submitQuote: this.submitQuote,
        stop: this.stop,
        // Catalogue des builds affichés dans la grille « Réalisations »
        builds: [
          { num: '01', name: 'MONOLITH',   tag: 'Full-tower · dual-loop custom',  cpu: 'Ryzen 9 9950X3D',    gpu: 'RTX 5090 OC', cool: 'Watercooling 360 + 420 mm',  tube: 'Tubes rigides PETG', caption: 'rendu — MONOLITH · vue 3/4' },
          { num: '02', name: 'OBSIDIENNE', tag: 'Distro-plate sur-mesure',        cpu: 'Core i9-14900KS',    gpu: 'RTX 5090',    cool: 'Distro-plate gravée',        tube: 'PETG noir fumé',     caption: 'rendu — OBSIDIENNE · profil' },
          { num: '03', name: 'CRYO',       tag: 'Loop blanc, finition glacier',   cpu: 'Ryzen 9 9950X',      gpu: 'RTX 5080',    cool: 'Double radiateur 360 mm',    tube: 'PETG translucide',   caption: 'rendu — CRYO · vue avant' },
          { num: '04', name: 'ATLAS',      tag: 'Station de travail HEDT',        cpu: 'Threadripper 7980X', gpu: 'RTX 5090',    cool: 'Mono-bloc CPU custom',       tube: 'Tubes rigides',      caption: 'rendu — ATLAS · vue 3/4' },
          { num: '05', name: 'AURORE',     tag: 'Verre trempé, RGB discret',      cpu: 'Ryzen 7 9800X3D',    gpu: 'RTX 5080',    cool: 'AIO 420 mm custom',          tube: 'Soft-tube gainé',    caption: 'rendu — AURORE · profil' },
          { num: '06', name: 'FORGE-01',   tag: 'Pièce unique numérotée',         cpu: 'Core i9-14900K',     gpu: 'RTX 5090',    cool: 'Loop dual + réservoir gravé', tube: 'PETG sur-mesure',   caption: 'rendu — FORGE-01 · vue avant' },
        ],
      };
    }
  };
};
