// Screen switching helper
function showScreen(name) {
  $(".screen").removeClass("active");
  $("#screen-" + name).addClass("active");
}

let draggingFood = null;
let offsetX = 0;
let offsetY = 0;
let totalAnimals = 0;
let fedCount = 0;

// Feed logic: check if the food is valid for the target animal and apply success/failure feedback
function feedAnimal(animalId, $food) {
  const $animal = $('.animal[data-animal-id="' + animalId + '"]');
  if ($animal.hasClass("fed")) return; // if this animal has already been fed, do nothing

  const target = $food.data("target");
  if (target && target !== animalId) {
    // Wrong food: provide a short error visual indicator and return without changing animal state
    $animal.addClass("wrong");
    setTimeout(() => $animal.removeClass("wrong"), 400);
    return;
  }

  // Correct feed: mark the animal as fed and update its visual state
  $animal.addClass("fed");

  const $img = $animal.find(".animal-image");
  const happySrc = $img.data("happy");
  if (happySrc) {
    $img.attr("src", happySrc);
  }

  // Mark the food as used/consumed so it cannot be used again
  $food.addClass("used");

  // Play a 'chewing' sound if the asset exists; ignore errors if it does not
  try {
    const chew = new Audio("sounds/chew.mp3");
    chew.play();
  } catch (e) {}

  fedCount++;
  if (fedCount >= totalAnimals) {
    setTimeout(() => showScreen("ending"), 800);
  }
}

// Initialize drag-and-drop interaction: mouse-based dragging of food items
function initDragDrop() {
  // Mousedown: begin dragging. Improvements: move the food element to the document body to avoid clipping by container overflow,
  // and record the original parent, next sibling, and coordinates so we can animate/restore back on drop.
  $(document).on("mousedown", ".food", function (e) {
    e.preventDefault();
    const $food = $(this);
    if ($food.hasClass("used")) return;

    draggingFood = $food;
    offsetX = e.clientX - this.getBoundingClientRect().left;
    offsetY = e.clientY - this.getBoundingClientRect().top;

    // Save original parent node, next sibling, and the original position to restore after completing the drag
    $food.data('origParent', $food.parent());
    $food.data('origNext', $food.next());
    const rect = this.getBoundingClientRect();
    $food.data('origLeft', rect.left);
    $food.data('origTop', rect.top);

    // Append the element to the document body and make it fixed positioned so it will follow the pointer reliably
    $(document.body).append($food);
    // Temporarily disable page text selection while dragging to prevent selection artifacts
    document.body.style.userSelect = 'none';

    $food.addClass("dragging").css({
      position: "fixed",
      left: rect.left + 'px',
      top: rect.top + 'px',
      "z-index": 1000
    });
  });

  // Mousemove: while dragging, update the element position to follow the cursor
  $(document).on("mousemove", function (e) {
    if (!draggingFood) return;
    draggingFood.css({
      left: e.clientX - offsetX,
      top: e.clientY - offsetY
    });
  });

  // Mouseup: finish dragging; detect which animal (if any) is under the drop point, attempt to feed it, and animate the food back to its original location.
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

    // Smoothly animate the food back to its original screen coordinates and then reinsert into its original parent container in the DOM
    const origLeft = $food.data('origLeft');
    const origTop = $food.data('origTop');
    const $origParent = $food.data('origParent');
    const $origNext = $food.data('origNext');

    // Re-enable text selection now that the drag operation is complete
    document.body.style.userSelect = '';

    $food.removeClass('dragging').animate({
      left: origLeft + 'px',
      top: origTop + 'px'
    }, 220, function () {
      // Reattach the food element into the original DOM location, clear inline positioning styles and z-index
      if ($origNext && $origNext.length) {
        $origNext.before($food);
      } else {
        $origParent.append($food);
      }
      $food.css({ position: '', left: '', top: '', 'z-index': '' });
    });
  });
}

// Init animal click sounds: when an animal element is clicked, play the audio referenced by its data attribute
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

// Reset the game state: clear 'fed' and 'wrong' classes, restore animals to normal images, and navigate back to the start screen
function resetGame() {
  fedCount = 0;
  $(".animal").removeClass("fed wrong");
  $(".food").removeClass("used");

  // Restore all animal images to the normal state (use data-normal attribute)
  $(".animal-image").each(function () {
    const $img = $(this);
    const normalSrc = $img.data("normal");
    if (normalSrc) {
      $img.attr("src", normalSrc);
    }
  });

  showScreen("start");
}

$(document).ready(function () {
  totalAnimals = $(".animal").length;

  // Screen navigation button handlers
  $("#btn-start").on("click", () => showScreen("choose"));
  $("#btn-go-inside").on("click", () => showScreen("barn"));
  $("#btn-go-outside").on("click", () => showScreen("outside"));
  // Barn/Outside swap buttons
  $("#btn-to-outside").on("click", () => showScreen("outside"));
  $("#btn-to-inside").on("click", () => showScreen("barn"));
  $("#btn-restart").on("click", resetGame);

  initDragDrop();
  initAnimalSounds();
  // 禁止拖动图片的原生行为
  $(".animal-image, .food img").attr("draggable", false);
});
