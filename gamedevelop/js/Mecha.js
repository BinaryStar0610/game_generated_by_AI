// 机甲实体：状态机 + 动画帧 + 碰撞箱管理
Game.Mecha = class Mecha {
  constructor(player, palette) {
    this.player = player; // 'p1' | 'p2'
    this.palette = palette;
    this.reset(player === "p1" ? 280 : 680, player === "p1" ? 1 : -1);
  }

  reset(x, facing) {
    this.x = x;
    this.y = Game.GROUND_Y; // 脚下 Y
    this.vx = 0;
    this.vy = 0;
    this.facing = facing; // 1 朝右, -1 朝左
    this.hp = Game.MAX_HP;
    this.stamina = Game.MAX_STAMINA;
    this.state = "idle";
    this.stateTimer = 0;
    this.attackHasHit = false;
    this.animFrame = 0;
    this.flashTimer = 0; // 受击白闪
    this.attackType = null; // 'light' | 'heavy'
    this.onGround = true;
    this.blocking = false;
    this.inputBuffer = null; // 输入缓冲 { action, life }
  }

  // 机甲身体碰撞箱（受击用），以中心脚部为基准
  getHitbox() {
    const w = Game.MECHA_W;
    const h = Game.MECHA_H;
    return {
      x: this.x - w / 2,
      y: this.y - h,
      w: w,
      h: h,
    };
  }

  // 攻击判定箱，仅攻击 active 阶段返回，否则 null
  getAttackbox() {
    if (
      (this.state !== "attackLight" && this.state !== "attackHeavy") ||
      this.attackHasHit
    ) {
      return null;
    }
    const t = this.stateTimer;
    let active = false;
    if (this.attackType === "light") {
      const total = Game.LIGHT_STARTUP + Game.LIGHT_ACTIVE + Game.LIGHT_RECOVERY;
      // active 阶段：stateTimer 在 [total-STARTUP-ACTIVE, total-STARTUP) 之间
      active = t <= total - Game.LIGHT_STARTUP && t > Game.LIGHT_RECOVERY;
    } else {
      const total = Game.HEAVY_STARTUP + Game.HEAVY_ACTIVE + Game.HEAVY_RECOVERY;
      active = t <= total - Game.HEAVY_STARTUP && t > Game.HEAVY_RECOVERY;
    }
    if (!active) return null;

    // 攻击箱在朝向侧前方
    const reach = this.attackType === "heavy" ? 30 : 22;
    const boxH = 18;
    const boxY = this.y - Game.MECHA_H + 14;
    const boxW = reach;
    const boxX =
      this.facing === 1 ? this.x + 4 : this.x - 4 - reach;
    return { x: boxX, y: boxY, w: boxW, h: boxH };
  }

  canAct() {
    return (
      this.state === "idle" ||
      this.state === "walk" ||
      this.state === "jump"
    );
  }

  // 开始轻攻击
  startLight() {
    if (this.stamina < Game.LIGHT_STAMINA) return false;
    this.state = "attackLight";
    this.attackType = "light";
    this.stateTimer =
      Game.LIGHT_STARTUP + Game.LIGHT_ACTIVE + Game.LIGHT_RECOVERY;
    this.attackHasHit = false;
    this.stamina -= Game.LIGHT_STAMINA;
    this.vx = this.facing * 1.8; // 出招前冲，更容易够到对手
    return true;
  }

  startHeavy() {
    if (this.stamina < Game.HEAVY_STAMINA) return false;
    this.state = "attackHeavy";
    this.attackType = "heavy";
    this.stateTimer =
      Game.HEAVY_STARTUP + Game.HEAVY_ACTIVE + Game.HEAVY_RECOVERY;
    this.attackHasHit = false;
    this.stamina -= Game.HEAVY_STAMINA;
    this.vx = this.facing * 3.0; // 重攻击前冲幅度更大
    return true;
  }

  jump() {
    if (!this.onGround) return false;
    if (this.stamina < Game.JUMP_STAMINA) return false;
    this.vy = Game.JUMP_FORCE;
    this.onGround = false;
    this.stamina -= Game.JUMP_STAMINA;
    if (this.state === "idle" || this.state === "walk") {
      this.state = "jump";
    }
    return true;
  }

  // 受到伤害
  takeDamage(amount, knockbackDir, isHeavy) {
    const wasBlocking = this.blocking && this.stamina > 0;
    let actual = amount;
    if (wasBlocking) {
      const reduction = isHeavy
        ? Game.HEAVY_BLOCK_REDUCTION
        : Game.BLOCK_REDUCTION;
      actual = Math.round(amount * (1 - reduction));
    }
    this.hp = Math.max(0, this.hp - actual);
    this.flashTimer = 6;

    if (this.hp <= 0) {
      this.state = "ko";
      this.stateTimer = 9999;
      this.vx = knockbackDir * (isHeavy ? 4 : 2);
      this.vy = -6;
      this.onGround = false;
      return { dmg: actual, blocked: wasBlocking, ko: true };
    }

    // 受击硬直与击退
    this.state = "hit";
    this.stateTimer = isHeavy ? Game.HEAVY_HITSTUN : Game.LIGHT_HITSTUN;
    this.blocking = false;
    this.vx = knockbackDir * (isHeavy ? 3.5 : 1.8);
    if (isHeavy) {
      this.vy = -5;
      this.onGround = false;
    }
    return { dmg: actual, blocked: wasBlocking, ko: false };
  }

  // 标记本次攻击已命中
  markHit() {
    this.attackHasHit = true;
  }

  // 输入缓冲：在任意状态下都记录攻击/跳跃意图，避免收招期间按键被丢弃
  _bufferInput(input) {
    // 已有缓冲衰减
    if (this.inputBuffer) {
      this.inputBuffer.life--;
      if (this.inputBuffer.life <= 0) this.inputBuffer = null;
    }
    // 记录新意图（覆盖旧缓冲，以最新按键为准）
    if (input.isJustPressed(this.player, "light")) {
      this.inputBuffer = { action: "light", life: Game.INPUT_BUFFER_LIFE };
    } else if (input.isJustPressed(this.player, "heavy")) {
      this.inputBuffer = { action: "heavy", life: Game.INPUT_BUFFER_LIFE };
    } else if (input.isJustPressed(this.player, "jump")) {
      this.inputBuffer = { action: "jump", life: Game.INPUT_BUFFER_LIFE };
    }
  }

  // 尝试消费输入缓冲：成功执行才清空，失败则保留等待下次重试（如体力不足或滞空）
  // 攻击仅地面触发；空中按攻击的意图会保留到落地瞬间触发（落地缓冲）
  _tryConsumeBuffer() {
    if (!this.inputBuffer) return false;
    const a = this.inputBuffer.action;
    let ok = false;
    if (a === "light" && this.onGround) ok = this.startLight();
    else if (a === "heavy" && this.onGround) ok = this.startHeavy();
    else if (a === "jump") ok = this.jump();
    if (ok) this.inputBuffer = null;
    return ok;
  }

  // 主更新：根据输入推进状态机
  update(input, opponent) {
    this.animFrame++;

    if (this.flashTimer > 0) this.flashTimer--;

    // 先缓冲本帧输入（任意状态都记录，收招/受击结束时消费）
    this._bufferInput(input);

    // KO 状态：仅做物理
    if (this.state === "ko") {
      this._physics();
      return;
    }

    // 受击硬直
    if (this.state === "hit") {
      this.stateTimer--;
      this._physics();
      if (this.stateTimer <= 0 && this.onGround) {
        this.state = "idle";
        this.vx = 0;
        // 受击恢复后尝试消费缓冲，允许立刻反击
        this._tryConsumeBuffer();
      }
      return;
    }

    // 攻击中
    if (this.state === "attackLight" || this.state === "attackHeavy") {
      this.stateTimer--;
      this._physics();
      if (this.stateTimer <= 0) {
        this.state = this.onGround ? "idle" : "jump";
        this.attackType = null;
        // 收招完成时尝试消费缓冲，实现流畅连招
        if (this.onGround) this._tryConsumeBuffer();
      }
      return;
    }

    // 可行动状态：idle / walk / jump / block
    // 自动朝向对手
    if (opponent) {
      this.facing = opponent.x >= this.x ? 1 : -1;
    }

    const p = this.player;

    // 防御（仅地面）：允许缓冲攻击取消防御
    if (this.onGround && input.isDown(p, "block") && this.stamina > 0) {
      if (
        this.inputBuffer &&
        (this.inputBuffer.action === "light" ||
          this.inputBuffer.action === "heavy")
      ) {
        if (this._tryConsumeBuffer()) {
          this.blocking = false;
          this._physics();
          return;
        }
      }
      this.blocking = true;
      this.state = "block";
      this.vx = 0;
      this.stamina = Math.max(0, this.stamina - Game.BLOCK_DRAIN);
      this._physics();
      return;
    }
    this.blocking = false;

    // 统一消费缓冲：攻击/跳跃意图在此触发
    // 覆盖地面点按、收招遗留、空中落地后补触发等所有场景
    if (this._tryConsumeBuffer()) {
      this._physics();
      return;
    }

    // 移动
    let moving = false;
    let dir = 0;
    if (input.isDown(p, "left")) dir -= 1;
    if (input.isDown(p, "right")) dir += 1;
    if (dir !== 0) {
      this.vx = dir * Game.MOVE_SPEED;
      moving = true;
    } else {
      this.vx = 0;
    }

    if (!this.onGround) {
      this.state = "jump";
    } else if (moving) {
      this.state = "walk";
      this.stamina = Math.max(0, this.stamina - 0.02);
    } else {
      this.state = "idle";
    }

    // 体力恢复（非攻击非防御非移动时）
    if (!moving && this.onGround) {
      this.stamina = Math.min(
        Game.MAX_STAMINA,
        this.stamina + Game.STAMINA_REGEN
      );
    }

    this._physics();
  }

  // 物理更新：重力、位移、地面/边界
  _physics() {
    // 重力
    if (!this.onGround) {
      this.vy += Game.GRAVITY;
    }
    this.x += this.vx;
    this.y += this.vy;

    // 地面碰撞
    if (this.y >= Game.GROUND_Y) {
      this.y = Game.GROUND_Y;
      this.vy = 0;
      if (!this.onGround) {
        this.onGround = true;
        if (this.state === "jump") this.state = "idle";
        this.vx = 0;
      }
    }

    // 摩擦（受击落地、攻击前冲后减速）
    if (
      this.onGround &&
      (this.state === "hit" ||
        this.state === "ko" ||
        this.state === "attackLight" ||
        this.state === "attackHeavy")
    ) {
      this.vx *= 0.82;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // 边界
    const margin = Game.MECHA_W / 2;
    if (this.x < margin) {
      this.x = margin;
      if (this.vx < 0) this.vx = 0;
    }
    if (this.x > Game.LOGIC_WIDTH - margin) {
      this.x = Game.LOGIC_WIDTH - margin;
      if (this.vx > 0) this.vx = 0;
    }
  }
};
