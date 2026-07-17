// 应用入口：画布缩放、界面切换、HUD 同步
(function () {
  const canvas = document.getElementById("game");
  const engine = new Game.GameEngine(canvas, onState);

  // DOM 引用
  const menu = document.getElementById("menu");
  const hud = document.getElementById("hud");
  const result = document.getElementById("result");
  const countdownOverlay = document.getElementById("countdown-overlay");
  const countdownText = document.getElementById("countdown-text");

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

  // 按钮
  document.getElementById("start-btn").addEventListener("click", () => {
    menu.classList.add("hidden");
    result.classList.add("hidden");
    hud.classList.remove("hidden");
    engine.startMatch();
  });
  document.getElementById("rematch-btn").addEventListener("click", () => {
    result.classList.add("hidden");
    hud.classList.remove("hidden");
    engine.startMatch();
  });
  document.getElementById("menu-btn").addEventListener("click", () => {
    engine.stop();
    result.classList.add("hidden");
    hud.classList.add("hidden");
    menu.classList.remove("hidden");
  });

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
    dotsP1.forEach((d, i) =>
      d.classList.toggle("on", i < s.wins.p1)
    );
    dotsP2.forEach((d, i) =>
      d.classList.toggle("on", i < s.wins.p2)
    );

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
      result.classList.remove("hidden");
      resultText.textContent = "K.O.";
      const name =
        s.winner === "p1" ? "红方 烈焰" : "蓝方 寒冰";
      winnerText.textContent = name + " 获胜！";
      resultText.classList.remove("pop");
      void resultText.offsetWidth;
      resultText.classList.add("pop");
    }
  }

  // 暴露用于调试
  window.__engine = engine;
})();
