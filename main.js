//全局背景音乐
const bgm = new Audio("sounds/background music.wav");
bgm.loop = false;
bgm.volume = 0.2;
const BGM_DELAY_MS = 3000;

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
    });
}

//屏幕切换函数
function showScreen(name) {
  $(".screen").removeClass("active");
  $("#screen-" + name).addClass("active");
}

let draggingFood = null;
let offsetX = 0;
let offsetY = 0;
let totalAnimals = 0;

//好感度
const MAX_HEARTS = 3;
const affection = {};

// 初始化好感度
function initAffection() {
  $(".animal").each(function () {
    const id = $(this).data("animal-id");
    affection[id] = 0;
    updateHeartsDisplay(id);
  });
}

//好感度动物的 ♥ 显示更新
function updateHeartsDisplay(animalId) {
  const value = affection[animalId] || 0;
  const $animal = $('.animal[data-animal-id="' + animalId + '"]');
  $animal.find(".heart").each(function () {
    const index = parseInt($(this).data("index"), 10);
    $(this).toggleClass("full", index <= value);
  });
}

// 改变好感度
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

//喂食逻辑
function feedAnimal(animalId, $food) {
  const $animal = $('.animal[data-animal-id="' + animalId + '"]');

  const target = $food.data("target");
  if (target && target !== animalId) {
    changeAffection(animalId, -1);
    $animal.addClass("wrong");
    setTimeout(() => $animal.removeClass("wrong"), 400);
    return;
  }
  changeAffection(animalId, +1);
  const currentAffection = affection[animalId];

  $animal.addClass("fed");
  setTimeout(() => $animal.removeClass("fed"), 500);

  // 图片三种形态
  const $img = $animal.find(".animal-image");
  const idleSrc = $img.data("idle");
  const jumpSrc = $img.data("jump");
  const loveSrc = $img.data("love");

  if (jumpSrc && idleSrc && loveSrc) {
    $img.attr("src", jumpSrc);

    if (currentAffection < MAX_HEARTS) {
      setTimeout(() => {
        if ((affection[animalId] || 0) < MAX_HEARTS) {
          $img.attr("src", idleSrc);
        }
      }, 500);
    } else if (currentAffection === MAX_HEARTS) {
      //播放动物叫声

      // 0.5 秒后切llove播放叫声
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

      // love 保持 3 秒
      setTimeout(() => {
        $img.attr("src", idleSrc);
      }, 500 + 3000);
    }
  }

  // 咀嚼音效
  try {
    const chew = new Audio("sounds/chew.mp3");
    chew.play();
  } catch (e) {}

  // 结束条件：所有动物都满好感度
  if (allAnimalsMaxAffection()) {
    setTimeout(() => {
      showScreen("ending");
    }, 3000);
  }
}

//拖拽逻辑
function initDragDrop() {
  $(document).on("mousedown", ".food", function (e) {
    e.preventDefault();
    const $food = $(this);

    draggingFood = $food;
    const rect = this.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

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

  $(document).on("mousemove", function (e) {
    if (!draggingFood) return;
    draggingFood.css({
      left: e.clientX - offsetX,
      top: e.clientY - offsetY
    });
  });

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

//动物点击叫声
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

//随机散步 转向
function initRandomAnimalWalk() {
  const MAX_OFFSET = 80;         // 左右最多移动的像素
  const MIN_DURATION = 3;        // 每次走路最少秒数
  const MAX_DURATION = 7;        // 最多秒数

  $(".animal").each(function (index) {
    const $animal = $(this);
    let $body = $animal.find(".animal-body");
    if (!$body.length) {
      $body = $animal.find(".animal-image");
    }

    function scheduleNextStep() {
      const offset = (Math.random() * 2 - 1) * MAX_OFFSET;
      const duration =
        MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);

      $animal.css("transition", `transform ${duration}s ease-in-out`);

      $animal.css("transform", `translateX(${offset}px)`);

      if ($body.length) {
        if (offset >= 0) {
          //向右走 面向右
          $body.css("transform", "scaleX(-1)");
        } else {
          //向左走 面向左
          $body.css("transform", "scaleX(1)");
        }
        $body.css("transition", "transform 0.4s ease");
      }

      //随机下一段
      const pause = 500 + Math.random() * 800; // 停一下更自然
      setTimeout(scheduleNextStep, duration * 1000 + pause);
    }

    const startDelay = index * 200;
    setTimeout(scheduleNextStep, startDelay);
  });
}

//重置游戏
function resetGame() {
  $(".animal").removeClass("fed wrong");
  $(".food").removeClass("used");

  //恢复图片为 idle
  $(".animal-image").each(function () {
    const $img = $(this);
    const idleSrc = $img.data("idle");
    if (idleSrc) {
      $img.attr("src", idleSrc);
    }
  });

  initAffection();

  showScreen("start");
}

//初始化
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

  $(".animal-image, .food img").attr("draggable", false);
});
