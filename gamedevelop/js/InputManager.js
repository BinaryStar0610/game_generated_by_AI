// 键盘输入管理器：维护持续按下与边沿触发（justPressed）两类状态
Game.InputManager = class InputManager {
  constructor() {
    this.pressed = new Set(); // 当前帧持续按下的 code
    this.justPressed = new Set(); // 本帧刚按下的 code（边沿触发）
    this._down = new Set(); // 浏览器报告的按下状态

    this._onKeyDown = (e) => {
      // 阻止方向键与空格滚动页面
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Space",
        ].includes(e.code)
      ) {
        e.preventDefault();
      }
      if (!this._down.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this._down.add(e.code);
      this.pressed.add(e.code);
    };
    this._onKeyUp = (e) => {
      this._down.delete(e.code);
      this.pressed.delete(e.code);
    };
    // 失焦时清空，避免按键卡住
    this._onBlur = () => {
      this._down.clear();
      this.pressed.clear();
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onBlur);
  }

  // 在每帧逻辑结束时调用，清空 justPressed
  endFrame() {
    this.justPressed.clear();
  }

  // 玩家某动作是否持续按下
  isDown(player, action) {
    const codes = Game.KEYS[player][action];
    for (const c of codes) {
      if (this.pressed.has(c)) return true;
    }
    return false;
  }

  // 玩家某动作是否本帧刚按下
  isJustPressed(player, action) {
    const codes = Game.KEYS[player][action];
    for (const c of codes) {
      if (this.justPressed.has(c)) return true;
    }
    return false;
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("blur", this._onBlur);
  }
};
