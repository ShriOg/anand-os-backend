const MAX_COMBO = 3.0;
const MIN_COMBO = 0.5;
const MAX_REACTION = 100;
const MIN_REACTION = 0;
const MIN_ACTION_INTERVAL_MS = 75;

const ACTION_EFFECTS = {
  attack: { combo: 0.08, reaction: 1 },
  defend: { combo: -0.03, reaction: 3 },
  burst: { combo: 0.15, reaction: -2 },
  focus: { combo: 0.0, reaction: 4 }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function processSkillAction(player, action) {
  if (!action || !action.type) {
    return false;
  }

  const now = Date.now();
  if (now - player.live.lastActionAt < MIN_ACTION_INTERVAL_MS) {
    return false;
  }

  const effect = ACTION_EFFECTS[action.type];
  if (!effect) {
    return false;
  }

  player.live.lastActionAt = now;
  player.live.combo = clamp(player.live.combo + effect.combo, MIN_COMBO, MAX_COMBO);
  player.live.reactionScore = clamp(
    player.live.reactionScore + effect.reaction,
    MIN_REACTION,
    MAX_REACTION
  );

  return true;
}

module.exports = {
  processSkillAction,
  clamp,
  MAX_COMBO,
  MIN_COMBO,
  MAX_REACTION,
  MIN_REACTION
};
