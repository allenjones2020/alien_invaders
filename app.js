const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const livesEl = document.getElementById("lives");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restart");

const keys = new Set();
const config = {
  playerSpeed: 5,
  laserSpeed: 7,
  invaderRows: 4,
  invaderCols: 8,
  invaderSpacing: 54,
  invaderDrop: 24,
  invaderSpeed: 0.7,
};

let gameState = null;

const createGameState = () => ({
  running: false,
  score: 0,
  lives: 3,
  wave: 1,
  frame: 0,
  player: {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 44,
    height: 16,
    cooldown: 0,
  },
  lasers: [],
  invaders: [],
  invaderDirection: 1,
  invaderSpeed: config.invaderSpeed,
  particles: [],
});

const initInvaders = () => {
  gameState.invaders = [];
  const offsetX =
    (canvas.width - (config.invaderCols - 1) * config.invaderSpacing) / 2;
  const offsetY = 70;
  for (let row = 0; row < config.invaderRows; row += 1) {
    for (let col = 0; col < config.invaderCols; col += 1) {
      gameState.invaders.push({
        x: offsetX + col * config.invaderSpacing,
        y: offsetY + row * 44,
        width: 32,
        height: 22,
        row,
      });
    }
  }
};

const startGame = () => {
  gameState = createGameState();
  initInvaders();
  updateHud();
  messageEl.textContent = "Wave 1 - Fight!";
  gameState.running = true;
};

const updateHud = () => {
  scoreEl.textContent = gameState.score;
  waveEl.textContent = gameState.wave;
  livesEl.textContent = gameState.lives;
};

const fireLaser = () => {
  if (gameState.player.cooldown > 0) {
    return;
  }
  gameState.lasers.push({
    x: gameState.player.x,
    y: gameState.player.y,
    width: 4,
    height: 18,
  });
  gameState.player.cooldown = 12;
};

const spawnExplosion = (x, y, color) => {
  for (let i = 0; i < 16; i += 1) {
    gameState.particles.push({
      x,
      y,
      radius: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 40 + Math.random() * 10,
      color,
    });
  }
};

const updatePlayer = () => {
  if (keys.has("ArrowLeft")) {
    gameState.player.x -= config.playerSpeed;
  }
  if (keys.has("ArrowRight")) {
    gameState.player.x += config.playerSpeed;
  }
  if (keys.has("Space")) {
    fireLaser();
  }
  gameState.player.x = Math.max(
    gameState.player.width / 2,
    Math.min(canvas.width - gameState.player.width / 2, gameState.player.x)
  );
  if (gameState.player.cooldown > 0) {
    gameState.player.cooldown -= 1;
  }
};

const updateLasers = () => {
  gameState.lasers = gameState.lasers
    .map((laser) => ({ ...laser, y: laser.y - config.laserSpeed }))
    .filter((laser) => laser.y + laser.height > 0);
};

const updateInvaders = () => {
  let shouldDrop = false;
  for (const invader of gameState.invaders) {
    invader.x += gameState.invaderSpeed * gameState.invaderDirection;
    if (
      invader.x + invader.width / 2 > canvas.width - 16 ||
      invader.x - invader.width / 2 < 16
    ) {
      shouldDrop = true;
    }
  }
  if (shouldDrop) {
    gameState.invaderDirection *= -1;
    for (const invader of gameState.invaders) {
      invader.y += config.invaderDrop;
    }
  }
};

const checkCollisions = () => {
  const remainingInvaders = [];
  for (const invader of gameState.invaders) {
    let hit = false;
    for (const laser of gameState.lasers) {
      if (
        laser.x > invader.x - invader.width / 2 &&
        laser.x < invader.x + invader.width / 2 &&
        laser.y < invader.y + invader.height / 2 &&
        laser.y + laser.height > invader.y - invader.height / 2
      ) {
        hit = true;
        laser.hit = true;
        spawnExplosion(invader.x, invader.y, "#ff9f68");
        gameState.score += 100;
      }
    }
    if (!hit) {
      remainingInvaders.push(invader);
    }
  }
  gameState.invaders = remainingInvaders;
  gameState.lasers = gameState.lasers.filter((laser) => !laser.hit);
};

const updateParticles = () => {
  gameState.particles = gameState.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx,
      y: particle.y + particle.vy,
      life: particle.life - 1,
    }))
    .filter((particle) => particle.life > 0);
};

const checkWaveState = () => {
  if (gameState.invaders.length === 0) {
    gameState.wave += 1;
    gameState.invaderSpeed += 0.2;
    initInvaders();
    messageEl.textContent = `Wave ${gameState.wave} incoming!`;
  }
};

const checkLoss = () => {
  for (const invader of gameState.invaders) {
    if (invader.y + invader.height / 2 >= gameState.player.y - 10) {
      gameState.lives -= 1;
      if (gameState.lives <= 0) {
        gameState.running = false;
        messageEl.textContent = "The invaders won. Press Restart!";
        return;
      }
      messageEl.textContent = "They broke through! Regroup!";
      resetPlayer();
      initInvaders();
      return;
    }
  }
};

const resetPlayer = () => {
  gameState.player.x = canvas.width / 2;
  gameState.player.cooldown = 0;
};

const drawBackground = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a1024";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 60; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
    ctx.fillRect(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      2,
      2
    );
  }
};

const drawPlayer = () => {
  const { x, y, width, height } = gameState.player;
  ctx.fillStyle = "#7dd8ff";
  ctx.beginPath();
  ctx.moveTo(x, y - height / 2);
  ctx.lineTo(x - width / 2, y + height / 2);
  ctx.lineTo(x + width / 2, y + height / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d6f5ff";
  ctx.fillRect(x - 4, y - height / 2 - 6, 8, 10);
};

const drawInvaders = () => {
  for (const invader of gameState.invaders) {
    ctx.fillStyle = invader.row % 2 === 0 ? "#ff8de0" : "#8affc7";
    ctx.fillRect(
      invader.x - invader.width / 2,
      invader.y - invader.height / 2,
      invader.width,
      invader.height
    );
    ctx.fillStyle = "#0c1222";
    ctx.fillRect(invader.x - 8, invader.y - 4, 6, 6);
    ctx.fillRect(invader.x + 2, invader.y - 4, 6, 6);
  }
};

const drawLasers = () => {
  ctx.fillStyle = "#ffe066";
  for (const laser of gameState.lasers) {
    ctx.fillRect(laser.x - 2, laser.y - laser.height, 4, laser.height);
  }
};

const drawParticles = () => {
  for (const particle of gameState.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.min(particle.life / 40, 1);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const render = () => {
  drawBackground();
  drawInvaders();
  drawLasers();
  drawPlayer();
  drawParticles();
};

const update = () => {
  if (!gameState.running) {
    render();
    return;
  }
  updatePlayer();
  updateLasers();
  updateInvaders();
  checkCollisions();
  updateParticles();
  checkWaveState();
  checkLoss();
  updateHud();
  render();
};

const loop = () => {
  update();
  requestAnimationFrame(loop);
};

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (!gameState.running) {
      startGame();
    }
    keys.add("Space");
  } else {
    keys.add(event.code);
  }
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

restartBtn.addEventListener("click", () => {
  startGame();
});

startGame();
loop();
