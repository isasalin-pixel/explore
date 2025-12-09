// ================== 全局背景音乐（跨所有场景） ==================
// 注意：工作区中音乐文件名含空格，使用正确路径以确保能加载
const bgm = new Audio("sounds/background music.wav");
bgm.loop = false;                    // 手动控制循环+间隔
bgm.volume = 0.2;                    // 背景音乐音量（0~1）
const BGM_DELAY_MS = 3000;          // 每次播完后等待 3 秒

let bgm_started = false;

bgm.addEventListener("ended", () => {
  setTimeout(() => {
    bgm.currentTime = 0;
    bgm.play().catch(() => {});
  }, BGM_DELAY_MS);
});

function startGlobalBGM() {
  if (bgm_started) return;

  bgm.play()
    .then(() => {
      bgm_started = true;
    })
    .catch(() => {
      // 第一次可能被拦截，下次点击再试
    });
}

// ================== 屏幕切换辅助函数 ==================
function showScreen(name) {
  $(".screen").removeClass("active");
  $("#screen-" + name).addClass("active");
}

let draggingFood = null;
let offsetX = 0;
let offsetY = 0;
let totalAnimals = 0;

// ====== 好感度（Hearts）系统 ======
const MAX_HEARTS = 3;
// 记录每只动物当前好感度：{ pig: 0, sheep: 0, horse: 0, duck: 0, ... }
const affection = {};

// 初始化所有动物好感度为 0，并刷新显示
function initAffection() {
  $(".animal").each(function () {
    const id = $(this).data("animal-id");
    affection[id] = 0;
    updateHeartsDisplay(id);
  });
}

// 根据当前好感度刷新对应动物的 ♥ 显示
function updateHeartsDisplay(animalId) {
  const value = affection[animalId] || 0;
  const $animal = $('.animal[data-animal-id="' + animalId + '"]');
  $animal.find(".heart").each(function () {
    const index = parseInt($(this).data("index"), 10);
    $(this).toggleClass("full", index <= value);
  });
}

// 改变好感度（加减），并限制在 0~MAX_HEARTS
function changeAffection(animalId, delta) {
  let current = affection[animalId] || 0;
  current += delta;
  if (current < 0) current = 0;
  if (current > MAX_HEARTS) current = MAX_HEARTS;
  affection[animalId] = current;
  updateHeartsDisplay(animalId);
}

// 检查是否所有动物都达到满好感度
function allAnimalsMaxAffection() {
  for (const id in affection) {
    if (affection[id] < MAX_HEARTS) {
      return false;
    }
  }
  return true;
}

// ================== 喂食逻辑 ==================
function feedAnimal(animalId, $food) {
  const $animal = $('.animal[data-animal-id="' + animalId + '"]');

  const target = $food.data("target");
  // ---- 喂错食物：好感 -1 + 红框反馈 ----
  if (target && target !== animalId) {
    changeAffection(animalId, -1);
    $animal.addClass("wrong");
    setTimeout(() => $animal.removeClass("wrong"), 400);
    return;
  }

  // ---- 喂对食物：好感 +1 ----
  changeAffection(animalId, +1);
  const currentAffection = affection[animalId];

  // 视觉反馈：短暂添加 .fed 触发“开心跳跃”动画（在 CSS 里定义）
  $animal.addClass("fed");
  setTimeout(() => $animal.removeClass("fed"), 500);

  // 图片：使用 idle / jump / love 三种形态
  const $img = $animal.find(".animal-image");
  const idleSrc = $img.data("idle");
  const jumpSrc = $img.data("jump");
  const loveSrc = $img.data("love");

  if (jumpSrc && idleSrc && loveSrc) {
    // 先播放“跳起”动作
    $img.attr("src", jumpSrc);

    if (currentAffection < MAX_HEARTS) {
      // ⭐ 未满 3 心：jump → idle
      setTimeout(() => {
        if ((affection[animalId] || 0) < MAX_HEARTS) {
          $img.attr("src", idleSrc);
        }
      }, 500);
    } else if (currentAffection === MAX_HEARTS) {
      // ⭐ 正好喂到满心：jump → love 3 秒 → idle，并播放动物叫声

      // 0.5 秒后切到 love 图并播放叫声
      setTimeout(() => {
        $img.attr("src", loveSrc);

        const soundPath = $animal.data("sound");
        if (soundPath) {
          try {
            const voice = new Audio(soundPath);
            voice.play();
          } catch (e) {}
        }
      }, 500);

      // love 保持 3 秒，之后恢复 idle（♥ 仍然保持 3）
      setTimeout(() => {
        $img.attr("src", idleSrc);
      }, 500 + 3000);
    }
  }

  // 咀嚼音效（每次喂对都会有）
  try {
    const chew = new Audio("sounds/chew.mp3");
    chew.play();
  } catch (e) {}

  // 结束条件：所有动物都满好感度
  if (allAnimalsMaxAffection()) {
    // ⭐ 等待 3 秒再进入结局画面
    setTimeout(() => {
      showScreen("ending");
      // 背景音乐继续，不用管
    }, 3000);
  }
}

// ================== 拖拽逻辑 ==================
function initDragDrop() {
  // 鼠标按下：开始拖动
  $(document).on("mousedown", ".food", function (e) {
    e.preventDefault();
    const $food = $(this);

    draggingFood = $food;
    const rect = this.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    // 保存原始位置和父节点，结束时恢复
    $food.data("origParent", $food.parent());
    $food.data("origNext", $food.next());
    $food.data("origLeft", rect.left);
    $food.data("origTop", rect.top);

    $(document.body).append($food);
    document.body.style.userSelect = "none";

    $food.addClass("dragging").css({
      position: "fixed",
      left: rect.left + "px",
      top: rect.top + "px",
      "z-index": 1000
    });
  });

  // 鼠标移动：更新位置
  $(document).on("mousemove", function (e) {
    if (!draggingFood) return;
    draggingFood.css({
      left: e.clientX - offsetX,
      top: e.clientY - offsetY
    });
  });

  // 鼠标松开：检测是否在某只动物上方，尝试喂食，然后动画返回原位
  $(document).on("mouseup", function (e) {
    if (!draggingFood) return;

    const $food = draggingFood;
    draggingFood = null;

    const x = e.clientX;
    const y = e.clientY;
    let targetId = null;

    $(".animal").each(function () {
      const rect = this.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        targetId = $(this).data("animal-id");
      }
    });

    if (targetId) {
      feedAnimal(targetId, $food);
    }

    const origLeft = $food.data("origLeft");
    const origTop = $food.data("origTop");
    const $origParent = $food.data("origParent");
    const $origNext = $food.data("origNext");

    document.body.style.userSelect = "";

    $food.removeClass("dragging").animate(
      {
        left: origLeft + "px",
        top: origTop + "px"
      },
      220,
      function () {
        if ($origNext && $origNext.length) {
          $origNext.before($food);
        } else {
          $origParent.append($food);
        }
        $food.css({ position: "", left: "", top: "", "z-index": "" });
      }
    );
  });
}

// ================== 动物点击叫声 ==================
function initAnimalSounds() {
  $(".animal").on("click", function () {
    const soundPath = $(this).data("sound");
    if (!soundPath) return;
    try {
      const audio = new Audio(soundPath);
      audio.play();
    } catch (e) {}
  });
}

// ================== 随机散步 + 转向 ==================
function initRandomAnimalWalk() {
  const MAX_OFFSET = 80;         // 左右最多移动的像素
  const MIN_DURATION = 3;        // 每次走路最少秒数
  const MAX_DURATION = 7;        // 最多秒数

  $(".animal").each(function (index) {
    const $animal = $(this);
    let $body = $animal.find(".animal-body");
    // 如果没有包裹 .animal-body，回退到直接操作图片元素，保证朝向可控
    if (!$body.length) {
      $body = $animal.find(".animal-image");
    }

    function scheduleNextStep() {
      // 在 [-MAX_OFFSET, MAX_OFFSET] 里随机一个目标位移
      const offset = (Math.random() * 2 - 1) * MAX_OFFSET;
      const duration =
        MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);

      // 设置过渡时间（每只动物都有自己的节奏）
      $animal.css("transition", `transform ${duration}s ease-in-out`);

      // 应用位移
      $animal.css("transform", `translateX(${offset}px)`);

      // 根据移动方向决定朝向（只翻转身体，不翻转文字 & 爱心）
      if ($body.length) {
        if (offset >= 0) {
          // 向右走 → 面向右
          $body.css("transform", "scaleX(-1)");
        } else {
          // 向左走 → 面向左
          $body.css("transform", "scaleX(1)");
        }
        $body.css("transition", "transform 0.4s ease");
      }

      // 走完这一段后，再随机下一段
      const pause = 500 + Math.random() * 800; // 停一下更自然
      setTimeout(scheduleNextStep, duration * 1000 + pause);
    }

    // 每只动物起步时间：取消随机部分，改为确定性错位（按索引）
    // 如果希望所有动物同时开始，将下面设置为 0
    const startDelay = index * 200;
    setTimeout(scheduleNextStep, startDelay);
  });
}

// ================== 重置游戏 ==================
function resetGame() {
  $(".animal").removeClass("fed wrong");
  $(".food").removeClass("used");

  // 恢复所有动物图片为 idle
  $(".animal-image").each(function () {
    const $img = $(this);
    const idleSrc = $img.data("idle");
    if (idleSrc) {
      $img.attr("src", idleSrc);
    }
  });

  // 重置好感度
  initAffection();

  showScreen("start");
}

// ================== 初始化 ==================
$(document).ready(function () {
  totalAnimals = $(".animal").length;

  initAffection();

  // 屏幕切换按钮
  $("#btn-start").on("click", () => {
    showScreen("choose");
    startGlobalBGM();
  });
  $("#btn-go-inside").on("click", () => showScreen("barn"));
  $("#btn-go-outside").on("click", () => showScreen("outside"));
  $("#btn-to-outside").on("click", () => showScreen("outside"));
  $("#btn-to-inside").on("click", () => showScreen("barn"));
  $("#btn-restart").on("click", () => {
    resetGame();
  });

  initDragDrop();
  initAnimalSounds();
  initRandomAnimalWalk();

  // 禁止图片原生拖拽
  $(".animal-image, .food img").attr("draggable", false);
});
