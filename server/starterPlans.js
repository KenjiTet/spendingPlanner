import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fail } from './errors.js'
import { readFlag, readId } from './input.js'

// Plans proposed at the end of the onboarding, kept in a versioned file: edited from the local admin page, shipped
// to production with the next deploy
const FILE = join(dirname(fileURLToPath(import.meta.url)), 'starterPlans.json')
const MODES = ['solo', 'duo']
const SCOPES = ['shared', 'personal']
// A share of the income, an amount in the tier currency, or a weight in what is left after the reserve
const KINDS = ['percent', 'fixed', 'rest']
// Shares of each person's income a starter plan leaves unassigned and sets aside for tax, as in src/utils/starterPlan.js
const RESERVE_PERCENT = 5
const TAX_PERCENT = 10
const MAX_LABEL = 80

/**
 * Every starter plan, read from the file on each call so an edit applies at once
 * @returns {object[]}
 */
export function readStarterPlans() {
  return JSON.parse(readFileSync(FILE, 'utf8')).plans
}

/**
 * @param {object[]} plans
 */
function writeStarterPlans(plans) {
  writeFileSync(FILE, `${JSON.stringify({ plans }, undefined, 2)}\n`)
}

/**
 * Non-empty text, trimmed
 * @param {unknown} value
 * @param {string} what - named in the refusal
 */
function readLabel(value, what) {
  const label = String(value ?? '').trim()

  if (!label || label.length > MAX_LABEL) {
    fail(400, `${what} : libellé manquant ou trop long.`)
  }

  return label
}

/**
 * A finite amount, zero or more
 * @param {unknown} value
 * @param {string} what - named in the refusal
 */
function readFigure(value, what) {
  const figure = Number(value)

  if (value === '' || value === null || !Number.isFinite(figure) || figure < 0) {
    fail(400, `${what} invalide.`)
  }

  return figure
}

/**
 * An income bracket in the tier currency, max null meaning no ceiling
 * @param {object} range
 */
function readRange(range) {
  const min = readFigure(range?.min, 'Fourchette : minimum')
  const typical = readFigure(range?.typical, 'Fourchette : revenu type')
  let max = null

  // Left empty, the bracket has no ceiling
  if ((range?.max ?? '') !== '') {
    max = readFigure(range.max, 'Fourchette : maximum')
  }

  if (max !== null && max <= min) {
    fail(400, 'Fourchette : le maximum doit dépasser le minimum.')
  }

  if (typical < min || (max !== null && typical >= max)) {
    fail(400, 'Fourchette : le revenu type doit tomber dans la fourchette.')
  }

  return { min, max, typical }
}

/**
 * The array sent, or none
 * @param {unknown} value
 */
function listOf(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
}

/**
 * A group of lines, each sized by a percentage of the income, a fixed amount or a weight in what is left; a line of a
 * plan for two also tells its scope
 * @param {object} group
 * @param {string} mode
 */
function readGroup(group, mode, section) {
  return {
    label: readLabel(group?.label, 'Groupe'),
    color: readLabel(group?.color, 'Couleur'),
    lines: listOf(group?.lines).map((line) => {
      const label = readLabel(line?.label, 'Ligne')

      if (!KINDS.includes(line?.kind)) {
        fail(400, `Ligne « ${label} » : type de calcul inconnu.`)
      }

      const value = readFigure(line.value, `Ligne « ${label} » : valeur`)
      const read = { label, kind: line.kind, value, autoBook: !!readFlag(line?.autoBook) }

      if (read.kind === 'percent' && value > 100) {
        fail(400, `Ligne « ${label} » : pourcentage supérieur à 100.`)
      }

      // A ceiling caps a percentage or a share of the rest, per person
      if ((line?.max ?? '') !== '') {
        if (read.kind === 'fixed') {
          fail(400, `Ligne « ${label} » : un montant fixe n’a pas de plafond.`)
        }

        read.max = readFigure(line.max, `Ligne « ${label} » : plafond`)
      }

      // A shortcut books on the line from the expense form, which only offers expense lines typed by hand
      if ((line?.shortcut ?? '') !== '') {
        if (section !== 'expenses' || read.autoBook) {
          fail(400, `Ligne « ${label} » : raccourci réservé aux dépenses sans prélèvement auto.`)
        }

        read.shortcut = readFigure(line.shortcut, `Ligne « ${label} » : raccourci`)

        if (!read.shortcut) {
          fail(400, `Ligne « ${label} » : raccourci à zéro.`)
        }
      }

      if (mode === 'duo') {
        if (!SCOPES.includes(line?.scope)) {
          fail(400, `Ligne « ${read.label} » : part commune ou personnelle manquante.`)
        }

        read.scope = line.scope
      }

      return read
    }),
  }
}

/**
 * Rebuilds a plan sent by the browser from its allowed fields
 * @param {string} id
 * @param {object} input
 */
function readStarterPlan(id, input) {
  if (!MODES.includes(input?.mode)) {
    fail(400, 'Mode inconnu.')
  }

  if (!Array.isArray(input.ranges) || !input.ranges.length) {
    fail(400, 'Au moins une fourchette de revenu est requise.')
  }

  const groupsOf = (section) => listOf(input[section]).map((group) => readGroup(group, input.mode, section))

  const plan = {
    id: readId(id),
    mode: input.mode,
    label: readLabel(input.label, 'Plan'),
    ranges: input.ranges.map(readRange).sort((first, second) => first.min - second.min),
    expenses: groupsOf('expenses'),
    savings: groupsOf('savings'),
  }

  checkPercentages(plan)

  return plan
}

/**
 * Refuses percentages that alone eat the tax and the reserve: fixed amounts shrink at a low income, percentages
 * cannot. A common line of a pair takes its percentage of the household, so each person pays that same percentage of
 * their income
 * @param {{ expenses: object[], savings: object[] }} plan
 */
function checkPercentages(plan) {
  const percent = [...plan.expenses, ...plan.savings]
    .flatMap((group) => group.lines)
    .filter((line) => line.kind === 'percent')
    .reduce((sum, line) => sum + line.value, 0)

  if (percent > 100 - TAX_PERCENT - RESERVE_PERCENT) {
    fail(400, `Les pourcentages totalisent ${Math.round(percent * 100) / 100} % du revenu : ${TAX_PERCENT} % vont aux impôts et ${RESERVE_PERCENT} % doivent rester libres.`)
  }
}

/**
 * Refuses brackets of one mode that overlap, the onboarding offering them side by side
 * @param {object[]} plans
 * @param {string} mode
 */
function checkOverlaps(plans, mode) {
  const ranges = plans
    .filter((plan) => plan.mode === mode)
    .flatMap((plan) => plan.ranges.map((range) => ({ ...range, label: plan.label })))
    .sort((first, second) => first.min - second.min)

  ranges.slice(1).forEach((range, index) => {
    const previous = ranges[index]

    if (previous.max === null || previous.max > range.min) {
      fail(400, `Fourchettes qui se chevauchent : « ${previous.label} » et « ${range.label} ».`)
    }
  })
}

/**
 * Creates or replaces a plan, then writes the file
 * @param {string} id
 * @param {object} input
 * @returns {object[]} every plan
 */
export function saveStarterPlan(id, input) {
  const plan = readStarterPlan(id, input)
  const plans = readStarterPlans()
  const index = plans.findIndex((candidate) => candidate.id === plan.id)

  if (index === -1) {
    plans.push(plan)
  } else {
    plans[index] = plan
  }

  checkOverlaps(plans, plan.mode)
  writeStarterPlans(plans)

  return plans
}

/**
 * Removes a plan, each mode keeping at least one so the onboarding always has something to offer
 * @param {string} id
 * @returns {object[]} every plan left
 */
export function deleteStarterPlan(id) {
  const plans = readStarterPlans()
  const plan = plans.find((candidate) => candidate.id === id)

  if (!plan) {
    fail(404, 'Plan introuvable.')
  }

  if (plans.filter((candidate) => candidate.mode === plan.mode).length === 1) {
    fail(400, 'Le dernier plan de ce mode ne peut pas être supprimé.')
  }

  const remaining = plans.filter((candidate) => candidate.id !== id)

  writeStarterPlans(remaining)

  return remaining
}
