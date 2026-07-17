// 粒子与伤害数字特效系统
Game.ParticleSystem = class ParticleSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
  }

  clear() {
    this.particles = [];
    this.texts = [];
  }

  // 命中粒子飞溅
  spawnHit(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1,
        life: 20 + Math.random() * 14,
        maxLife: 34,
        size: 2 + Math.floor(Math.random() * 2),
        color,
        gravity: 0.18,
      });
    }
    // 中心闪光
    this.particles.push({
      x: x - 6,
      y: y - 6,
      vx: 0,
      vy: 0,
      life: 8,
      maxLife: 8,
      size: 12,
      color: "#ffffff",
      gravity: 0,
      flash: true,
    });
  }

  // 防御挡光粒子
  spawnBlock(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const spd = 0.8 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 14 + Math.random() * 8,
        maxLife: 22,
        size: 2,
        color,
        gravity: 0.05,
      });
    }
  }

  // 攻击残影/出招粒子
  spawnAttackTrail(x, y, color) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        life: 10 + Math.random() * 8,
        maxLife: 18,
        size: 2,
        color,
        gravity: 0,
      });
    }
  }

  // 伤害飘字
  addDamageText(x, y, dmg, color, blocked) {
    this.texts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -1.6,
      life: 50,
      maxLife: 50,
      text: blocked ? "BLOCK " + dmg : dmg.toString(),
      color: blocked ? Game.UI.gold : color,
      size: blocked ? 12 : 16,
    });
  }

  // 环境灰烬
  spawnEmber() {
    this.particles.push({
      x: Math.random() * Game.LOGIC_WIDTH,
      y: Game.LOGIC_HEIGHT + 4,
      vx: -0.2 + Math.random() * 0.1,
      vy: -0.3 - Math.random() * 0.4,
      life: 240,
      maxLife: 240,
      size: 2,
      color: Math.random() < 0.5 ? Game.SCENE.ember : "#ffce6b",
      gravity: -0.005,
      ember: true,
      drift: Math.random() * Math.PI * 2,
    });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      if (p.ember) {
        p.drift += 0.05;
        p.x += p.vx + Math.sin(p.drift) * 0.3;
        p.y += p.vy;
        p.vy += p.gravity;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.96;
      }
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life--;
      t.x += t.vx;
      t.y += t.vy;
      t.vy *= 0.94;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    // 随机补充灰烬
    if (Math.random() < 0.25) this.spawnEmber();
  }

  render(ctx) {
    for (const p of this.particles) {
      const a = p.flash ? p.life / p.maxLife : Math.min(1, p.life / 14);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // 伤害数字
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of this.texts) {
      const a = Math.min(1, t.life / 20);
      ctx.globalAlpha = a;
      ctx.font = `${t.size}px "Press Start 2P", monospace`;
      // 描边
      ctx.fillStyle = "#000000";
      ctx.fillText(t.text, Math.round(t.x) + 1, Math.round(t.y) + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, Math.round(t.x), Math.round(t.y));
    }
    ctx.globalAlpha = 1;
  }
};
