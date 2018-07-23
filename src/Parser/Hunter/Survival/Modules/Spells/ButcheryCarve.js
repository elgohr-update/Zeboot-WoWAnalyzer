import SPELLS from 'common/SPELLS';
import Analyzer from 'Parser/Core/Analyzer';
import Abilities from 'Parser/Core/Modules/Abilities';
import SpellUsable from 'Parser/Core/Modules/SpellUsable';

/**
 * Carve: A sweeping attack that strikes all enemies in front of you for Physical damage.
 * Butchery: Strike all nearby enemies in a flurry of strikes, inflicting Phsyical damage to each. Has 3 charges.
 * Both: Reduces the remaining cooldown on Wildfire Bomb by 1 sec for each target hit, up to 5.
 */

const COOLDOWN_REDUCTION_MS = 1000;
const MAX_TARGETS_HIT = 5;
const MS_BUFFER = 100;

class ButcheryCarve extends Analyzer {
  static dependencies = {
    spellUsable: SpellUsable,
    abilities: Abilities,
  };

  hasGT = false;
  resets = 0;
  timeOfLastCast = 0;
  effectiveWFBCDR = 0;
  wastedWFBCDR = 0;
  reductionAtCurrentCast = 0;
  effectiveWFBReductionMs = 0;
  wastedWFBReductionMs = 0;

  constructor(...args) {
    super(...args);
    if (this.selectedCombatant.hasTalent(SPELLS.GUERRILLA_TACTICS_TALENT.id)) {
      this.hasGT = true;
    }
  }

  on_byPlayer_cast(event) {
    const spellId = event.ability.guid;
    if (spellId !== SPELLS.BUTCHERY_TALENT.id && spellId !== SPELLS.CARVE.id) {
      return;
    }
    this.casts++;
    if (event.timestamp > this.timeOfLastCast + MS_BUFFER) {
      this.timeOfLastCast = event.timestamp;
      this.reductionAtCurrentCast = 0;
    }
  }

  on_byPlayer_damage(event) {
    const spellId = event.ability.guid;
    if (spellId !== SPELLS.BUTCHERY_TALENT.id && spellId !== SPELLS.CARVE.id) {
      return;
    }
    if (this.reductionAtCurrentCast === MAX_TARGETS_HIT) {
      return;
    }
    this.reductionAtCurrentCast++;

    if (!this.spellUsable.isOnCooldown(SPELLS.WILDFIRE_BOMB.id)) {
      this.wastedWFBCDR += COOLDOWN_REDUCTION_MS;
      return;
    }

    if (this.spellUsable.cooldownRemaining(SPELLS.WILDFIRE_BOMB.id) > COOLDOWN_REDUCTION_MS) {
      this.effectiveWFBCDR += this.spellUsable.reduceCooldown(SPELLS.WILDFIRE_BOMB.id, COOLDOWN_REDUCTION_MS);
      return;
    }

    if (this.hasGT) {
      const newChargeCDR = this.abilities.getExpectedCooldownDuration(SPELLS.WILDFIRE_BOMB.id) - this.spellUsable.cooldownRemaining(SPELLS.WILDFIRE_BOMB.id);
      this.spellUsable.endCooldown(SPELLS.WILDFIRE_BOMB.id, false, event.timestamp, newChargeCDR);
      return;
    }

    const effectiveReductionMs = this.spellUsable.reduceCooldown(SPELLS.WILDFIRE_BOMB.id, COOLDOWN_REDUCTION_MS);
    this.effectiveWFBReductionMs += effectiveReductionMs;
    this.wastedWFBReductionMs += (COOLDOWN_REDUCTION_MS - effectiveReductionMs);
  }
}

export default ButcheryCarve;
