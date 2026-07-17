// 像素美术绘制：机甲角色与战场场景，全部用 Canvas 矩形拼合生成
Game.PixelArt = class PixelArt {
  // 单个像素块
  static px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  }

  // 预生成星空
  static makeStars(count = 70) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * Game.LOGIC_WIDTH,
        y: Math.random() * 300,
        s: Math.random() < 0.8 ? 2 : 3,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.04,
      });
    }
    return stars;
  }

  // 预生成城市剪影数据
  static makeCity() {
    const far = [];
    const near = [];
    let x = -10;
    while (x < Game.LOGIC_WIDTH + 20) {
      const w = 24 + Math.floor(Math.random() * 40);
      const h = 60 + Math.floor(Math.random() * 130);
      far.push({ x, w, h, broken: Math.random() < 0.3 });
      x += w + 6;
    }
    x = -20;
    while (x < Game.LOGIC_WIDTH + 30) {
      const w = 40 + Math.floor(Math.random() * 70);
      const h = 90 + Math.floor(Math.random() * 160);
      const windows = [];
      const cols = Math.floor(w / 10);
      const rows = Math.floor(h / 14);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (Math.random() < 0.12) {
            windows.push({
              x: 4 + c * 10,
              y: 8 + r * 14,
              on: Math.random() < 0.7,
            });
          }
        }
      }
      near.push({ x, w, h, windows });
      x += w + 10;
    }
    return { far, near };
  }

  // 绘制背景天空与远景
  static drawBackground(ctx, time, stars, city) {
    const W = Game.LOGIC_WIDTH;
    const H = Game.LOGIC_HEIGHT;
    // 天空渐变
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, Game.SCENE.skyTop);
    grad.addColorStop(0.55, Game.SCENE.skyMid);
    grad.addColorStop(1, Game.SCENE.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 月亮
    ctx.fillStyle = "#ffe9c4";
    ctx.beginPath();
    ctx.arc(800, 90, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = Game.SCENE.skyMid;
    ctx.beginPath();
    ctx.arc(790, 82, 22, 0, Math.PI * 2);
    ctx.fill();

    // 星空
    for (const s of stars) {
      const alpha = 0.5 + 0.5 * Math.sin(time * s.speed + s.twinkle);
      ctx.globalAlpha = alpha;
      this.px(ctx, s.x, s.y, s.s, s.s, Game.SCENE.star);
    }
    ctx.globalAlpha = 1;

    // 远景城市
    for (const b of city.far) {
      this.px(ctx, b.x, H - 80 - b.h, b.w, b.h, Game.SCENE.cityFar);
      if (b.broken) {
        // 顶部断裂斜切
        this.px(ctx, b.x, H - 80 - b.h, b.w, 10, Game.SCENE.skyMid);
      }
    }

    // 近景城市
    for (const b of city.near) {
      const baseY = H - 80;
      this.px(ctx, b.x, baseY - b.h, b.w, b.h, Game.SCENE.cityNear);
      // 窗户灯光
      for (const win of b.windows) {
        if (win.on) {
          const flick = 0.6 + 0.4 * Math.sin(time * 0.03 + win.x);
          ctx.globalAlpha = flick;
          this.px(
            ctx,
            b.x + win.x,
            baseY - b.h + win.y,
            4,
            4,
            Game.UI.gold
          );
        }
      }
      ctx.globalAlpha = 1;
    }

    // 地面
    this.px(ctx, 0, H - 80, W, 80, Game.SCENE.ground);
    // 地面顶边亮线
    this.px(ctx, 0, H - 80, W, 2, Game.SCENE.groundLine);
    // 地面像素裂纹
    ctx.fillStyle = Game.SCENE.groundLine;
    const cracks = [
      [120, 470, 40, 2],
      [300, 490, 60, 2],
      [560, 475, 30, 2],
      [720, 500, 50, 2],
      [180, 510, 25, 2],
      [640, 485, 35, 2],
    ];
    for (const [cx, cy, cw, ch] of cracks) {
      ctx.fillRect(cx, cy, cw, ch);
    }
    // 两侧废墟碎块
    this.px(ctx, 20, 440, 50, 26, Game.SCENE.cityNear);
    this.px(ctx, 890, 436, 60, 30, Game.SCENE.cityNear);
  }

  // 绘制机甲：根据状态切换姿态
  static drawMecha(ctx, mecha, time) {
    const p = mecha.palette;
    const w = Game.MECHA_W;
    const h = Game.MECHA_H;
    // 呼吸浮动
    let bob = 0;
    if (mecha.state === "idle") {
      bob = Math.round(Math.sin(time * 0.08) * 1);
    }
    // 受击闪白
    const flashing = mecha.flashTimer > 0 && mecha.flashTimer % 2 === 0;
    const col = (c) => (flashing ? "#ffffff" : c);

    ctx.save();
    // 平移到机甲脚部中心，并按朝向翻转
    ctx.translate(Math.round(mecha.x), Math.round(mecha.y + bob));
    ctx.scale(mecha.facing, 1);

    // KO 倒地：旋转绘制
    if (mecha.state === "ko") {
      ctx.rotate((mecha.facing * Math.PI) / 2.2);
    }

    // 局部坐标：(0,0) 为脚部中心，向上为负 Y
    const ox = -w / 2;
    const oy = -h;

    const draw = (lx, ly, lw, lh, color) =>
      this.px(ctx, ox + lx, oy + ly, lw, lh, col(color));

    // ===== 腿部 =====
    let legOffset = 0;
    let legBend = 0;
    if (mecha.state === "walk") {
      legOffset = Math.round(Math.sin(time * 0.4) * 3);
    } else if (mecha.state === "jump" || !mecha.onGround) {
      legBend = 4;
    } else if (mecha.state === "ko") {
      legBend = 0;
    }

    // 后腿
    draw(10, 32 - legBend, 6, 16 - legBend, p.dark);
    draw(10, 44 - legBend, 8, 4, p.secondary);
    // 前腿
    draw(16, 32 + legOffset - legBend, 6, 16 - legOffset - legBend, p.secondary);
    draw(16, 44 + legOffset - legBend, 8, 4, p.primary);

    // ===== 躯干 =====
    // 主体
    draw(9, 16, 14, 18, p.primary);
    draw(9, 16, 4, 18, p.dark); // 阴影侧
    draw(19, 16, 4, 18, p.highlight); // 高光侧
    // 胸甲
    draw(10, 14, 12, 4, p.secondary);
    // 能量核心
    const corePulse = 0.7 + 0.3 * Math.sin(time * 0.15);
    ctx.globalAlpha = corePulse;
    draw(13, 20, 6, 6, p.glow);
    ctx.globalAlpha = 1;
    draw(14, 21, 4, 4, "#ffffff");

    // 肩甲
    draw(6, 15, 6, 6, p.secondary);
    draw(20, 15, 6, 6, p.secondary);
    draw(6, 15, 6, 2, p.highlight);
    draw(20, 15, 6, 2, p.highlight);

    // ===== 头部 =====
    let headTilt = 0;
    if (mecha.state === "hit") headTilt = -2;
    if (mecha.state === "block") headTilt = 1;
    draw(11, 4 + headTilt, 10, 10, p.primary);
    draw(11, 4 + headTilt, 3, 10, p.dark);
    draw(18, 4 + headTilt, 3, 10, p.highlight);
    // 面甲/护目镜
    draw(12, 7 + headTilt, 8, 3, p.outline);
    const eyeGlow = 0.6 + 0.4 * Math.sin(time * 0.2);
    ctx.globalAlpha = eyeGlow;
    draw(14, 8 + headTilt, 5, 1, p.glow);
    ctx.globalAlpha = 1;
    // 天线
    draw(15, 0 + headTilt, 2, 4, p.secondary);
    draw(15, -2 + headTilt, 2, 2, p.glow);

    // ===== 手臂与武器 =====
    this._drawArms(ctx, mecha, p, draw, time);

    ctx.restore();
  }

  // 根据状态绘制手臂与武器
  static _drawArms(ctx, mecha, p, draw, time) {
    const state = mecha.state;

    if (state === "attackLight") {
      // 前臂前伸 + 光刃
      draw(20, 18, 16, 5, p.secondary);
      draw(20, 18, 16, 1, p.highlight);
      // 光刃
      const t = mecha.stateTimer;
      const total =
        Game.LIGHT_STARTUP + Game.LIGHT_ACTIVE + Game.LIGHT_RECOVERY;
      const active = t <= total - Game.LIGHT_STARTUP && t > Game.LIGHT_RECOVERY;
      if (active) {
        const bladeLen = 22;
        ctx.globalAlpha = 0.85;
        this.px(ctx, 36, 19, bladeLen, 4, p.glow);
        this.px(ctx, 36, 20, bladeLen, 2, "#ffffff");
        ctx.globalAlpha = 1;
      }
      // 后臂
      draw(6, 18, 8, 5, p.dark);
    } else if (state === "attackHeavy") {
      // 双臂前伸 + 大型能量炮
      const t = mecha.stateTimer;
      const total =
        Game.HEAVY_STARTUP + Game.HEAVY_ACTIVE + Game.HEAVY_RECOVERY;
      const charging = t > total - Game.HEAVY_STARTUP;
      const active = t <= total - Game.HEAVY_STARTUP && t > Game.HEAVY_RECOVERY;
      draw(18, 17, 18, 7, p.secondary);
      draw(18, 17, 18, 2, p.highlight);
      // 炮口
      this.px(ctx, 36, 16, 8, 9, p.dark);
      this.px(ctx, 38, 18, 4, 5, p.outline);
      if (charging) {
        const r = 2 + Math.floor((total - t) / 4);
        ctx.globalAlpha = 0.8;
        this.px(ctx, 36, 19 - r, 6, r * 2 + 2, p.glow);
        ctx.globalAlpha = 1;
      }
      if (active) {
        ctx.globalAlpha = 0.9;
        this.px(ctx, 44, 18, 20, 5, p.glow);
        this.px(ctx, 44, 19, 20, 3, "#ffffff");
        ctx.globalAlpha = 1;
      }
      draw(6, 18, 8, 5, p.dark);
    } else if (state === "block") {
      // 能量盾
      draw(8, 17, 14, 7, p.secondary);
      // 盾牌
      const shieldAlpha = 0.5 + 0.2 * Math.sin(time * 0.25);
      ctx.globalAlpha = shieldAlpha;
      ctx.strokeStyle = p.glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(28, 24, 16, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = p.glow;
      ctx.beginPath();
      ctx.arc(28, 24, 16, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 盾纹
      ctx.strokeStyle = p.highlight;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(28, 24, 10, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    } else if (state === "hit") {
      // 双臂后撤
      draw(4, 16, 8, 6, p.dark);
      draw(20, 17, 8, 5, p.secondary);
    } else {
      // idle / walk / jump
      const swing =
        state === "walk" ? Math.round(Math.sin(time * 0.4) * 2) : 0;
      // 后臂
      draw(5, 17 + swing, 7, 6, p.dark);
      // 前臂
      draw(20, 17 - swing, 7, 6, p.secondary);
      draw(20, 17 - swing, 7, 1, p.highlight);
      // 前臂小型武器
      draw(26, 18 - swing, 4, 4, p.dark);
    }
  }
};
