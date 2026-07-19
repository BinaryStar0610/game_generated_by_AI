// 游戏主引擎：主循环、阶段状态机、战斗判定、回合/胜负管理
Game.GameEngine = class GameEngine {
  constructor(canvas, onState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.onState = onState || (() => {});

    this.input = new Game.InputManager();
    this.renderer = new Game.Renderer();
    this.particles = new Game.ParticleSystem();

    this.mecha1 = new Game.Mecha("p1", Game.PALETTE_P1);
    this.mecha2 = new Game.Mecha("p2", Game.PALETTE_P2);

    // 阶段状态
    this.phase = "idle"; // idle | countdown | fighting | roundEnd | gameOver
    this.round = 1;
    this.wins = { p1: 0, p2: 0 };
    this.winner = null; // 整局胜者
    this.roundTimer = Game.ROUND_TIME_FRAMES;
    this.countdown = 0;
    this.roundEndTimer = 0;
    this.roundWinner = null;
    this.fightAnnounce = 0; // "FIGHT!" 公告剩余帧
    this.time = 0; // 全局帧计数（用于动画）

    this.mode = "pvp"; // "pvp" | "pve"
    this.ai = null; // 人机模式下的 AI 控制器

    this._raf = null;
    this._lastTs = 0;
    this._acc = 0;
    this._running = false;
  }

  // 开始一整局新比赛
  startMatch(mode = "pvp") {
    this.mode = mode;
    this.wins = { p1: 0, p2: 0 };
    this.winner = null;
    this.round = 1;
    // 人机模式创建 AI 控制器（控制 P2）
    if (mode === "pve") {
      this.ai = new Game.AIController(this.mecha2, this.mecha1);
    } else {
      this.ai = null;
    }
    this._startRound();
    if (!this._running) {
      this._running = true;
      this._lastTs = performance.now();
      this._raf = requestAnimationFrame((t) => this._loop(t));
    }
    this._emit();
  }

  _startRound() {
    this.mecha1.reset(280, 1);
    this.mecha2.reset(680, -1);
    if (this.ai) this.ai.reset();
    this.input.clearVirtual();
    this.particles.clear();
    this.phase = "countdown";
    this.countdown = Game.COUNTDOWN_FRAMES;
    this.roundTimer = Game.ROUND_TIME_FRAMES;
    this.roundWinner = null;
    this.fightAnnounce = 0;
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  destroy() {
    this.stop();
    this.input.destroy();
  }

  // 主循环：固定步长 1/60s
  _loop(ts) {
    if (!this._running) return;
    let dt = (ts - this._lastTs) / 1000;
    this._lastTs = ts;
    // 防止后台切换造成的大跳
    if (dt > 0.25) dt = 0.25;
    this._acc += dt;
    const step = 1 / 60;
    let guard = 0;
    while (this._acc >= step && guard < 5) {
      this._update();
      this.input.endFrame(); // 每次逻辑步进后立即清空，防止多步进时 justPressed 被重复消费
      if (this.ai) this.ai.endFrame();
      this._acc -= step;
      guard++;
    }
    this._render();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  _update() {
    this.time++;
    this.particles.update();

    if (this.phase === "countdown") {
      this.countdown--;
      if (this.countdown <= 0) {
        this.phase = "fighting";
        this.fightAnnounce = Game.FIGHT_ANNOUNCE_FRAMES;
      }
      // 倒计时阶段也更新机甲动画（待机呼吸），但不响应输入
      this._emit();
      return;
    }

    // FIGHT! 公告倒计时（期间玩家已可行动）
    if (this.fightAnnounce > 0) {
      this.fightAnnounce--;
    }

    if (this.phase === "roundEnd") {
      this.roundEndTimer--;
      // 让机甲继续物理（KO 倒地动画）
      this.mecha1.update(this.input, this.mecha2);
      this._updateP2();
      if (this.roundEndTimer <= 0) {
        if (
          this.wins.p1 >= Game.ROUNDS_TO_WIN ||
          this.wins.p2 >= Game.ROUNDS_TO_WIN
        ) {
          this.winner =
            this.wins.p1 > this.wins.p2 ? "p1" : "p2";
          this.phase = "gameOver";
        } else {
          this.round++;
          this._startRound();
        }
      }
      this._emit();
      return;
    }

    if (this.phase === "fighting") {
      this.mecha1.update(this.input, this.mecha2);
      this._updateP2();

      // 防止两机甲重叠：简单推开
      this._separate(this.mecha1, this.mecha2);

      // 战斗判定
      this._resolveCombat(this.mecha1, this.mecha2);
      this._resolveCombat(this.mecha2, this.mecha1);

      // 回合计时
      this.roundTimer--;
      if (this.roundTimer <= 0) {
        // 超时：血量高者胜
        if (this.mecha1.hp > this.mecha2.hp) {
          this._endRound("p1");
        } else if (this.mecha2.hp > this.mecha1.hp) {
          this._endRound("p2");
        } else {
          // 平局：重赛本回合
          this._startRound();
        }
        this._emit();
        return;
      }

      // KO 检测
      if (this.mecha1.hp <= 0 && this.mecha2.hp <= 0) {
        this._endRound("draw");
      } else if (this.mecha1.hp <= 0) {
        this._endRound("p2");
      } else if (this.mecha2.hp <= 0) {
        this._endRound("p1");
      }

      this._emit();
      return;
    }

    if (this.phase === "gameOver") {
      // 结算界面，仅更新粒子
      this._emit();
      return;
    }
  }

  // 攻击命中判定
  _resolveCombat(attacker, defender) {
    if (attacker.attackHasHit) return;
    const ab = attacker.getAttackbox();
    if (!ab) return;
    const hb = defender.getHitbox();
    if (this._intersect(ab, hb)) {
      const isHeavy = attacker.attackType === "heavy";
      const damage = isHeavy ? Game.HEAVY_DAMAGE : Game.LIGHT_DAMAGE;
      const knockbackDir = defender.x >= attacker.x ? 1 : -1;

      // 命中点：攻击盒与受击盒交界中心
      const hx = (Math.max(ab.x, hb.x) + Math.min(ab.x + ab.w, hb.x + hb.w)) / 2;
      const hy = (Math.max(ab.y, hb.y) + Math.min(ab.y + ab.h, hb.y + hb.h)) / 2;

      const result = defender.takeDamage(damage, knockbackDir, isHeavy);
      attacker.markHit();

      if (result.blocked) {
        this.particles.spawnBlock(hx, hy, defender.palette.glow);
      } else {
        this.particles.spawnHit(hx, hy, isHeavy ? "#ffffff" : attacker.palette.glow, isHeavy ? 18 : 12);
      }
      this.particles.addDamageText(hx, hy - 14, result.dmg, isHeavy ? Game.UI.gold : "#ffffff", result.blocked);
    }
  }

  _intersect(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // 更新 P2：人机模式由 AI 驱动，双人对战由键盘驱动
  _updateP2() {
    if (this.ai) {
      this.ai.update();
      this.mecha2.update(this.ai, this.mecha1);
    } else {
      this.mecha2.update(this.input, this.mecha1);
    }
  }

  // 简单的机体分离，避免重叠
  _separate(a, b) {
    const ha = a.getHitbox();
    const hb = b.getHitbox();
    if (this._intersect(ha, hb)) {
      const overlap = Math.min(ha.x + ha.w, hb.x + hb.w) - Math.max(ha.x, hb.x);
      const push = overlap / 2 + 0.5;
      if (a.x <= b.x) {
        a.x -= push;
        b.x += push;
      } else {
        a.x += push;
        b.x -= push;
      }
      const margin = Game.MECHA_W / 2;
      a.x = Math.max(margin, Math.min(Game.LOGIC_WIDTH - margin, a.x));
      b.x = Math.max(margin, Math.min(Game.LOGIC_WIDTH - margin, b.x));
    }
  }

  _endRound(winner) {
    this.roundWinner = winner;
    if (winner === "p1") this.wins.p1++;
    else if (winner === "p2") this.wins.p2++;
    // 平局不计胜场
    this.phase = "roundEnd";
    this.roundEndTimer = Game.ROUND_END_DELAY;
  }

  _render() {
    this.ctx.clearRect(0, 0, Game.LOGIC_WIDTH, Game.LOGIC_HEIGHT);
    this.renderer.render(this.ctx, this, this.time);
  }

  // 向 UI 层推送状态快照
  _emit() {
    this.onState({
      phase: this.phase,
      round: this.round,
      wins: { ...this.wins },
      winner: this.winner,
      roundWinner: this.roundWinner,
      hp1: this.mecha1.hp,
      hp2: this.mecha2.hp,
      stam1: this.mecha1.stamina,
      stam2: this.mecha2.stamina,
      timer: Math.ceil(this.roundTimer / 60),
      countdown: Math.ceil(this.countdown / 60),
      fightAnnounce: this.fightAnnounce,
      mode: this.mode,
    });
  }
};
