// 应用入口：画布缩放、界面切换、HUD 同步、模式选择、触屏控制
(function () {
  const canvas = document.getElementById("game");
  const engine = new Game.GameEngine(canvas, onState);

  // 设备检测：触摸设备视为移动端
  const isTouch =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // DOM 引用
  const menu = document.getElementById("menu");
  const hud = document.getElementById("hud");
  const result = document.getElementById("result");
  const countdownOverlay = document.getElementById("countdown-overlay");
  const countdownText = document.getElementById("countdown-text");
  const touchControls = document.getElementById("touch-controls");
  const pvpBtn = document.getElementById("pvp-btn");
  const pveBtn = document.getElementById("pve-btn");
  const ctrlP2 = document.getElementById("ctrl-p2");
  const hintText = document.getElementById("hint-text");
  const touchHint = document.getElementById("touch-hint");
  const p2Name = document.getElementById("p2-name");

  let lastCountdownShown = null; // 记录上次显示的倒计时内容，避免每帧重置动画
  const hp1 = document.getElementById("hp1");
  const hp2 = document.getElementById("hp2");
  const stam1 = document.getElementById("stam1");
  const stam2 = document.getElementById("stam2");
  const timerEl = document.getElementById("timer");
  const roundText = document.getElementById("roundText");
  const dotsP1 = [
    document.getElementById("dot-p1-1"),
    document.getElementById("dot-p1-2"),
  ];
  const dotsP2 = [
    document.getElementById("dot-p2-1"),
    document.getElementById("dot-p2-2"),
  ];

  const resultText = document.getElementById("result-text");
  const winnerText = document.getElementById("winner-text");

  // 移动端：隐藏双人对战按钮与 P2 控制说明，显示触屏控制与横屏提示
  if (isTouch) {
    pvpBtn.classList.add("hidden");
    ctrlP2.classList.add("hidden");
    hintText.classList.add("hidden");
    touchHint.classList.remove("hidden");
  }

  // 开始一局
  function startMatch(mode) {
    menu.classList.add("hidden");
    result.classList.add("hidden");
    hud.classList.remove("hidden");
    // P2 名称在人机模式下显示为 CPU
    p2Name.textContent = mode === "pve" ? "CPU 寒冰" : "P2 寒冰";
    // 移动端显示触屏控制
    if (isTouch) {
      touchControls.classList.remove("hidden");
    }
    engine.startMatch(mode);
  }

  pvpBtn.addEventListener("click", () => startMatch("pvp"));
  pveBtn.addEventListener("click", () => startMatch("pve"));

  document.getElementById("rematch-btn").addEventListener("click", () => {
    result.classList.add("hidden");
    hud.classList.remove("hidden");
    if (isTouch) touchControls.classList.remove("hidden");
    // 再战沿用上一局模式
    engine.startMatch(engine.mode);
  });
  document.getElementById("menu-btn").addEventListener("click", () => {
    engine.stop();
    result.classList.add("hidden");
    hud.classList.add("hidden");
    touchControls.classList.add("hidden");
    menu.classList.remove("hidden");
  });

  // ===== 触屏按键绑定（持续型：移动/防御；边沿型：跳跃/轻攻/重攻） =====
  function bindTouchBtn(id, player, action) {
    const el = document.getElementById(id);
    if (!el) return;
    const press = (e) => {
      e.preventDefault();
      engine.input.pressVirtual(player, action);
    };
    const release = (e) => {
      e.preventDefault();
      engine.input.releaseVirtual(player, action);
    };
    // 触摸事件
    el.addEventListener("touchstart", press, { passive: false });
    el.addEventListener("touchend", release, { passive: false });
    el.addEventListener("touchcancel", release, { passive: false });
    // 鼠标事件（电脑端调试触屏也可用）
    el.addEventListener("mousedown", press);
    el.addEventListener("mouseup", release);
    el.addEventListener("mouseleave", release);
  }
  bindTouchBtn("t-left", "p1", "left");
  bindTouchBtn("t-right", "p1", "right");
  bindTouchBtn("t-jump", "p1", "jump");
  bindTouchBtn("t-light", "p1", "light");
  bindTouchBtn("t-heavy", "p1", "heavy");
  bindTouchBtn("t-block", "p1", "block");

  // 引擎状态回调：更新 HUD 与界面
  function onState(s) {
    // 血量条（按比例）
    hp1.style.width = (s.hp1 / Game.MAX_HP) * 100 + "%";
    hp2.style.width = (s.hp2 / Game.MAX_HP) * 100 + "%";
    // 体力条
    stam1.style.width = (s.stam1 / Game.MAX_STAMINA) * 100 + "%";
    stam2.style.width = (s.stam2 / Game.MAX_STAMINA) * 100 + "%";
    // 回合计时
    timerEl.textContent = Math.max(0, s.timer);
    roundText.textContent = "ROUND " + s.round;

    // 胜场圆点
    dotsP1.forEach((d, i) => d.classList.toggle("on", i < s.wins.p1));
    dotsP2.forEach((d, i) => d.classList.toggle("on", i < s.wins.p2));

    // 倒计时与 FIGHT! 公告
    if (s.phase === "countdown") {
      countdownOverlay.classList.remove("hidden");
      const n = s.countdown;
      // 仅在秒数变化时更新文字与触发动画，避免每帧重置导致抖动
      if (n !== lastCountdownShown) {
        countdownText.textContent = n > 0 ? String(n) : "";
        countdownText.classList.remove("pop");
        void countdownText.offsetWidth; // 重置动画
        countdownText.classList.add("pop");
        lastCountdownShown = n;
      }
    } else if (s.fightAnnounce > 0) {
      // FIGHT! 公告阶段：玩家已可行动，公告显示 1 秒后消失
      countdownOverlay.classList.remove("hidden");
      if (lastCountdownShown !== "FIGHT") {
        countdownText.textContent = "FIGHT!";
        countdownText.classList.remove("pop");
        void countdownText.offsetWidth;
        countdownText.classList.add("pop");
        lastCountdownShown = "FIGHT";
      }
    } else {
      countdownOverlay.classList.add("hidden");
      lastCountdownShown = null;
    }

    // 结算
    if (s.phase === "gameOver") {
      hud.classList.add("hidden");
      touchControls.classList.add("hidden");
      result.classList.remove("hidden");
      resultText.textContent = "K.O.";
      const name = s.winner === "p1" ? "红方 烈焰" : "蓝方 寒冰";
      winnerText.textContent = name + " 获胜！";
      resultText.classList.remove("pop");
      void resultText.offsetWidth;
      resultText.classList.add("pop");
    }
  }

  // 暴露用于调试
  window.__engine = engine;
})();
