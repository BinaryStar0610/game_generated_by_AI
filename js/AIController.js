// 人机控制器：每帧决策，实现与 InputManager 一致的接口（isDown / isJustPressed / endFrame）
// 控制目标固定为 P2，由 GameEngine 在人机模式下传给 mecha2.update
Game.AIController = class AIController {
  constructor(self, opponent) {
    this.self = self; // 被控机甲（p2）
    this.opponent = opponent; // 对手机甲（p1）
    // 持续型动作（移动、防御）
    this.held = {
      left: false,
      right: false,
      block: false,
    };
    // 边沿型动作（跳跃、轻攻、重攻）：本帧 justPressed 标记
    this._just = new Set();
    // 反应延迟队列：决策写入 _pending，延迟 reactionFrames 帧后才生效到 held/_just
    this._pending = null;
    this._reactionTimer = 0;
  }

  reset() {
    this.held = { left: false, right: false, block: false };
    this._just.clear();
    this._pending = null;
    this._reactionTimer = 0;
  }

  isDown(player, action) {
    if (player !== "p2") return false;
    if (action === "left" || action === "right" || action === "block") {
      return this.held[action];
    }
    // 攻击与跳跃不作为持续动作
    return false;
  }

  isJustPressed(player, action) {
    if (player !== "p2") return false;
    return this._just.has(action);
  }

  endFrame() {
    this._just.clear();
  }

  // 决策结果暂存到 _pending，延迟生效模拟反应时间
  _schedule(decision) {
    this._pending = decision;
    this._reactionTimer = Game.AI.reactionFrames;
  }

  // 把决策应用到实际状态
  _apply(decision) {
    this.held.left = !!decision.left;
    this.held.right = !!decision.right;
    this.held.block = !!decision.block;
    if (decision.jump) this._just.add("jump");
    if (decision.light) this._just.add("light");
    if (decision.heavy) this._just.add("heavy");
  }

  update() {
    // 处理待生效决策
    if (this._pending) {
      if (this._reactionTimer > 0) {
        this._reactionTimer--;
        // 反应延迟期间保持上一帧的持续动作（不重置），但清空边沿
        return;
      }
      this._apply(this._pending);
      this._pending = null;
      return;
    }

    const me = this.self;
    const op = this.opponent;

    // 非可行动状态不决策（攻击中、受击、KO）
    if (
      me.state === "ko" ||
      me.state === "hit" ||
      me.state === "attackLight" ||
      me.state === "attackHeavy"
    ) {
      // 保持持续动作归零，避免滑步
      this.held.left = false;
      this.held.right = false;
      this.held.block = false;
      return;
    }

    const dx = op.x - me.x;
    const dist = Math.abs(dx);
    const dir = dx >= 0 ? 1 : -1;

    const opAttacking =
      op.state === "attackLight" || op.state === "attackHeavy";

    // 1. 对手正在攻击且距离近 → 防御
    if (opAttacking && dist < 90 && me.onGround) {
      if (Math.random() < Game.AI.blockChance) {
        this._schedule({ block: true });
        return;
      }
    }

    // 2. 体力过低 → 后撤恢复
    if (me.stamina < Game.AI.lowStamina && me.onGround) {
      this._schedule({
        left: dir === 1,
        right: dir === -1,
      });
      return;
    }

    // 3. 在攻击距离内 → 概率攻击
    if (dist < Game.AI.attackRange && me.onGround) {
      if (Math.random() < Game.AI.attackChance) {
        if (Math.random() < Game.AI.heavyChance) {
          this._schedule({ heavy: true });
        } else {
          this._schedule({ light: true });
        }
        return;
      }
      // 不攻击时偶尔防御或保持
      if (Math.random() < 0.1) {
        this._schedule({ block: true });
        return;
      }
    }

    // 4. 距离过近 → 跳跃脱身或后撤
    if (dist < Game.AI.retreatRange && me.onGround) {
      if (Math.random() < Game.AI.retreatChance) {
        this._schedule({
          left: dir === 1,
          right: dir === -1,
        });
        return;
      }
      if (Math.random() < 0.03) {
        this._schedule({ jump: true });
        return;
      }
    }

    // 5. 距离偏远 → 主动接近，偶尔跳跃
    if (dist > Game.AI.attackRange) {
      const decision = {
        left: dir === -1,
        right: dir === 1,
      };
      if (Math.random() < Game.AI.jumpChance && me.onGround) {
        decision.jump = true;
      }
      this._schedule(decision);
      return;
    }

    // 6. 中等距离待机：偶尔跳跃或防御
    if (me.onGround && Math.random() < 0.008) {
      this._schedule({ jump: true });
      return;
    }

    // 默认待机
    this._schedule({});
  }
};
