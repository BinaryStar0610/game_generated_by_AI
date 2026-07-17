// 渲染管线：按层级顺序绘制场景、机甲、特效与 CRT 滤镜
Game.Renderer = class Renderer {
  constructor() {
    this.stars = Game.PixelArt.makeStars(80);
    this.city = Game.PixelArt.makeCity();
  }

  render(ctx, engine, time) {
    const W = Game.LOGIC_WIDTH;
    const H = Game.LOGIC_HEIGHT;

    // 1. 背景层
    Game.PixelArt.drawBackground(ctx, time, this.stars, this.city);

    // 2. 机甲层（KO 的先画，避免遮挡活着的）
    const mechas = [engine.mecha1, engine.mecha2];
    mechas.sort((a, b) => {
      if (a.state === "ko" && b.state !== "ko") return -1;
      if (b.state === "ko" && a.state !== "ko") return 1;
      return 0;
    });
    for (const m of mechas) {
      Game.PixelArt.drawMecha(ctx, m, time);
    }

    // 3. 攻击判定箱调试（可选，默认关闭）
    // this._drawHitboxes(ctx, engine);

    // 4. 粒子与伤害数字
    engine.particles.render(ctx);

    // 5. CRT 扫描线 + 暗角
    this._drawCRT(ctx, time);
  }

  _drawCRT(ctx, time) {
    const W = Game.LOGIC_WIDTH;
    const H = Game.LOGIC_HEIGHT;
    // 扫描线
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#000000";
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
    // 微弱颤动
    ctx.globalAlpha = 0.03;
    ctx.fillRect(0, 0, W, H);
    // 暗角
    const grad = ctx.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.35,
      W / 2,
      H / 2,
      H * 0.85
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  _drawHitboxes(ctx, engine) {
    ctx.globalAlpha = 0.4;
    for (const m of [engine.mecha1, engine.mecha2]) {
      const hb = m.getHitbox();
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
      const ab = m.getAttackbox();
      if (ab) {
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(ab.x, ab.y, ab.w, ab.h);
      }
    }
    ctx.globalAlpha = 1;
  }
};
