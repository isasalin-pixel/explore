// ====================== 音效设置 ====================== //

// 点击音效、投喂成功/失败音效
const sfx = {
  click:   new Audio("music/click/close-out-click.ogg"),
  success: new Audio("music/click/feed-success.ogg"),
  fail:    new Audio("music/click/feed-fail.ogg")
};

// 通用播放函数
function playSound(name) {
  const sound = sfx[name];
  if (!sound) return;
  sound.currentTime = 0;
  sound.play();
}

// ====================== 背景音乐（MP3版） ====================== //

// ⬇️ ⬇️ 这里更新成 background_music.mp3 ⬇️ ⬇️
const bgm = new Audio("music/background_music.mp3");   
bgm.loop = true;
bgm.volume = 0.45;
bgm._started = false;

// 浏览器政策：必须用户触发后才能播放
function initBGM() {
  if (bgm._started) return;
  bgm._started = true;
  bgm.play().catch(() => {});
}

// ====================== 切换画面 ====================== //
function showScreen(name) {
  $(".screen").removeClass("active");
  $("#screen-" + name).addClass("active");
}

let draggingFood = null;
let offsetX = 0;
let offsetY = 0;
let totalAnimals = 0;
let fedCount = 0;

// ====================== 投喂逻辑 ====================== //
function feedAnimal(animalId, $food) {
  const $animal = $('.animal[data-animal-id="' + animalId + '"]');

  if ($animal.hasClass("fed")) return;

  const target = $food.data("target");

  // ❌ 错误食物
  if (target && target !== animalId) {
    $animal.addClass("wrong");
    setTimeout(() => $animal.removeClass("wrong"), 400);

    playSound("fail");
    return;
  }

  // ✅ 正确食物
  playSound("success");
  $animal.addClass("fed");

  const $img = $animal.find(".animal-image");
  $img.attr("src", $img.data("happy"));

  $food.addClass("used");

  fedCount++;
  if (fedCount >= totalAnimals) {
    setTimeout(() => showScreen("ending"), 900);
  }
}

// ====================== 拖拽食物 ====================== //
function initDragDrop() {
  $(document).on("mousedown", ".food", function (e) {
    e.preventDefault();
    const $food = $(this);
    if ($food.hasClass("used")) return;

    draggingFood = $food;

    const rect = this.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    // 记录元素原始位置
    $food.data("origParent", $food.parent());
    $food.data("origNext", $food.next());
    $food.data("origLeft", rect.left);
    $food.data("origTop", rect.top);

    $(document.body).append($food);
    document.body.style.userSelect = "none";

    $food.addClass("dragging").css({
      position: "fixed",
      left: rect.left,
      top: rect.top,
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

    let targetId = null;
    const x = e.clientX;
    const y = e.clientY;

    $(".animal").each(function () {
      const r = this.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        targetId = $(this).data("animal-id");
      }
    });

    if (targetId) feedAnimal(targetId, $food);

    // 归位动画
    const origLeft = $food.data("origLeft");
    const origTop = $food.data("origTop");
    const $origParent = $food.data("origParent");
    const $origNext = $food.data("origNext");

    document.body.style.userSelect = "";

    $food.removeClass("dragging").animate({
      left: origLeft,
      top: origTop
    }, 200, function () {
      if ($origNext && $origNext.length) {
        $origNext.before($food);
      } else {
        $origParent.append($food);
      }

      $food.css({
        position: "",
        left: "",
        top: "",
        "z-index": ""
      });
    });
  });
}

// ====================== 动物点击叫声 ====================== //
function initAnimalSounds() {
  $(".animal").on("click", function () {
    const path = $(this).data("sound");
    if (!path) return;

    const audio = new Audio(path);
    audio.play().catch(() => {});
  });
}

// ====================== 重置游戏 ====================== //
function resetGame() {
  fedCount = 0;
  $(".animal").removeClass("fed wrong");
  $(".food").removeClass("used");

  $(".animal-image").each(function () {
    const normal = $(this).data("normal");
    $(this).attr("src", normal);
  });

  showScreen("start");
}

// ====================== 初始化 ====================== //
$(document).ready(function () {
  totalAnimals = $(".animal").length;

  // 按钮音效 + BGM 启动
  $("#btn-start").on("click", () => {
    playSound("click");
    initBGM();
    showScreen("choose");
  });

  $("#btn-go-inside").on("click", () => {
    playSound("click");
    initBGM();
    showScreen("barn");
  });

  $("#btn-go-outside").on("click", () => {
    playSound("click");
    initBGM();
    showScreen("outside");
  });

  $("#btn-to-outside").on("click", () => {
    playSound("click");
    initBGM();
    showScreen("outside");
  });

  $("#btn-to-inside").on("click", () => {
    playSound("click");
    initBGM();
    showScreen("barn");
  });

  $("#btn-restart").on("click", () => {
    playSound("click");
    initBGM();
    resetGame();
  });

  initDragDrop();
  initAnimalSounds();

  $(".animal-image, .food img").attr("draggable", false);
});
