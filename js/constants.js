// 全局游戏常量与调色板配置
const Game = (window.Game = window.Game || {});

// 画布逻辑分辨率
Game.LOGIC_WIDTH = 960;
Game.LOGIC_HEIGHT = 540;
Game.GROUND_Y = 460; // 机甲脚下 Y 坐标（与地面顶边 540-80 对齐）
Game.GRAVITY = 0.8;
Game.MOVE_SPEED = 3.2;
Game.JUMP_FORCE = -14.5;

// 机甲尺寸
Game.MECHA_W = 32;
Game.MECHA_H = 48;

// 战斗数值
Game.MAX_HP = 100;
Game.MAX_STAMINA = 100;
Game.LIGHT_DAMAGE = 8;
Game.HEAVY_DAMAGE = 18;
Game.LIGHT_STAMINA = 10;
Game.HEAVY_STAMINA = 20;
Game.BLOCK_REDUCTION = 0.7; // 轻攻击被防御后削减比例
Game.HEAVY_BLOCK_REDUCTION = 0.3; // 重攻击破防削减比例
Game.STAMINA_REGEN = 0.42; // 体力恢复 / 帧
Game.BLOCK_DRAIN = 0.25; // 防御体力消耗 / 帧
Game.JUMP_STAMINA = 8;

// 攻击帧数（缩短后摇、加大判定窗口，改善手感）
Game.LIGHT_STARTUP = 3; // 轻攻击起手帧
Game.LIGHT_ACTIVE = 8; // 轻攻击判定持续帧
Game.LIGHT_RECOVERY = 5; // 轻攻击收招帧
Game.HEAVY_STARTUP = 8; // 重攻击蓄力帧
Game.HEAVY_ACTIVE = 10;
Game.HEAVY_RECOVERY = 10;
Game.LIGHT_HITSTUN = 8; // 轻攻击受击硬直
Game.HEAVY_HITSTUN = 16; // 重攻击受击硬直
Game.INPUT_BUFFER_LIFE = 30; // 输入缓冲有效帧数（覆盖一次跳跃滞空时间）

// 回合
Game.ROUNDS_TO_WIN = 2;
Game.ROUND_TIME_FRAMES = 3600; // 60s @60fps
Game.COUNTDOWN_FRAMES = 180; // 3 秒倒计时
Game.FIGHT_ANNOUNCE_FRAMES = 60; // "FIGHT!" 公告显示帧数（1 秒）
Game.ROUND_END_DELAY = 120; // 回合结束间歇 2 秒

// 人机 AI 参数
Game.AI = {
  attackRange: 78, // 进入此距离内考虑攻击
  safeRange: 150, // 大于此距离主动接近
  retreatRange: 46, // 小于此距离可能后撤或跳跃
  blockChance: 0.55, // 对手攻击时防御概率
  heavyChance: 0.18, // 攻击时选择重击的概率
  attackChance: 0.32, // 在攻击距离内每帧发起攻击的概率
  jumpChance: 0.006, // 随机跳跃概率
  retreatChance: 0.02, // 过近时后撤概率
  lowStamina: 24, // 体力低于此值后撤恢复
  reactionFrames: 4, // 反应延迟帧数
};

// 调色板
Game.PALETTE_P1 = {
  primary: "#ff2e88", // 霓虹品红
  secondary: "#b3165f",
  dark: "#5e0a30",
  highlight: "#ff7ab8",
  outline: "#1a0410",
  glow: "#ffe26b",
};

Game.PALETTE_P2 = {
  primary: "#00e5ff", // 青蓝
  secondary: "#0094a8",
  dark: "#004a57",
  highlight: "#7af3ff",
  outline: "#02181c",
  glow: "#bafff0",
};

// 场景调色
Game.SCENE = {
  skyTop: "#1a0b2e",
  skyMid: "#3d1958",
  skyBottom: "#7a2d52",
  star: "#fff4e0",
  cityFar: "#241342",
  cityNear: "#160a26",
  ground: "#0d0616",
  groundLine: "#2a1a40",
  ember: "#ff8a3d",
};

// UI 颜色
Game.UI = {
  bg: "#0a0414",
  hpP1: "#ff2e88",
  hpP2: "#00e5ff",
  hpBack: "#2a1130",
  stamina: "#7cff5a",
  gold: "#ffd23f",
  text: "#f4e9ff",
  dim: "#8a6fa8",
};

// 按键映射
Game.KEYS = {
  p1: {
    left: ["KeyA"],
    right: ["KeyD"],
    jump: ["KeyW"],
    light: ["KeyJ"],
    heavy: ["KeyK"],
    block: ["KeyL"],
  },
  p2: {
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    jump: ["ArrowUp"],
    light: ["Numpad1", "Comma"],
    heavy: ["Numpad2", "Period"],
    block: ["Numpad3", "Slash"],
  },
};
