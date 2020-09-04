export interface AssemblerQuantity {
  assemblers: number;
}

export interface RateQuantity {
  perSecond: number;
}

export type Quantity = AssemblerQuantity | RateQuantity;

export interface SpeedMultiplier {
  base: number;
  productionBonus: number;
}

interface SpeedConfiguration {
  base: number;
  speedBonus: number;
  productivityBonus: number;
}

interface SpeedCoercionPattern {
  pattern: RegExp;
  handler(matches: RegExpMatchArray): Partial<SpeedConfiguration>;
}

interface SpeedCoercions {
  label: string;
  base: SpeedConfiguration;
  constants?: { [k: string]: number | SpeedConfiguration };
  number?(x: number): number;
  percent?(x: number): number;
  patterns?: SpeedCoercionPattern[];
}

const modulePatterns: SpeedCoercionPattern[] = [
  {
    pattern: /^([0-9]+)prod(Mod|Module|Modules)$/,
    handler: ([, count]) => ({ speedBonus: -0.15 * +count, productivityBonus: 0.10 * +count }),
  },
  {
    pattern: /^([0-9]+)speed(Mod|Module|Modules)$/,
    handler: ([, count]) => ({ speedBonus: 0.50 * +count }),
  },
];

function combineConfigurations(left: SpeedConfiguration, right: Partial<SpeedConfiguration>): SpeedConfiguration {
  return {
    base: 'base' in right ? right.base : left.base,
    productivityBonus: left.productivityBonus + ('productivityBonus' in right ? right.productivityBonus : 0),
    speedBonus: left.speedBonus + ('speedBonus' in right ? right.speedBonus : 0),
  };
}

function coerceSpeedPart(settings: SpeedCoercions): (configuration: SpeedConfiguration, input: string) => SpeedConfiguration {
  return (configuration, input): SpeedConfiguration => {
    // Check constants
    if (settings.constants && input in settings.constants) {
      const matchingConstant = settings.constants[input];
      if (typeof matchingConstant === 'number') {
        return { ...configuration, base: matchingConstant };
      }

      return combineConfigurations(configuration, matchingConstant);
    }

    // Check percent
    if (settings.percent && /^[0-9]+%$/.test(input)) {
      return { ...configuration, base: settings.percent(+input.slice(0, -1)) };
    }

    // Check plain number
    if (settings.number && !Number.isNaN(+input)) {
      return { ...configuration, base: settings.number(+input) };
    }

    // Check other patterns
    if (settings.patterns) {
      for (const { pattern, handler } of settings.patterns) {
        const match = input.match(pattern);
        if (match !== null) {
          return combineConfigurations(configuration, handler(match));
        }
      }
    }

    throw new Error(`Unrecognized ${settings.label}: ${input}`);
  };
}

function coerceSpeed(settings: SpeedCoercions): (input: string) => SpeedMultiplier {
  return (input) => {
    if (typeof input === 'number') {
      throw new Error('Invalid input ' + input);
    }
    const configuration = input.split(',').reduce(coerceSpeedPart(settings), settings.base);
    return { base: configuration.base * (1 + configuration.speedBonus), productionBonus: configuration.productivityBonus };
  }
}

export function coerceQuantity(input: string): Quantity {
  if (!Number.isNaN(+input)) {
    if (Number.isInteger(+input)) {
      return { assemblers: +input };
    }

    throw new Error('Cannot specify the number of assemblers with a non-integer value');
  }

  const match = input.match(/^([0-9]+|[0-9]*\.[0-9]+)\/([0-9]+|[0-9]*\.[0-9]+)?([smh])?$/);
  if (match !== null) {
    const [, numerator, denominator = 1, suffix = 's'] = match;
    const multiplier = { s: 1, m: 60, h: 60 * 60 }[suffix];
    return { perSecond: +numerator / (+denominator * multiplier) };
  }

  throw new Error(`Unrecognized quantity: ${input}`);
}

export function coerceLabSpeed(input: string): SpeedMultiplier {
  return coerceSpeed({
    label: 'lab speed',
    base: { base: 1, speedBonus: 2.5, productivityBonus: 0 },
    constants: { max: 1 },
    percent: value => 1 + value / 100,
    number: value => value,
    patterns: modulePatterns,
  })(input);
}

export function coerceAssemblerSpeed(input: string): SpeedMultiplier {
  return coerceSpeed({
    label: 'assembler speed',
    base: { base: 1.25, speedBonus: 0, productivityBonus: 0 },
    constants: {
      max: 1.25,
      grey: 0.5,
      blue: 0.75,
      yellow: 1.25,
    },
    number: value => value,
    patterns: modulePatterns,
  })(input);
}

export function coerceFurnaceSpeed(input: string): SpeedMultiplier {
  return coerceSpeed({
    label: 'furnace speed',
    base: { base: 2, speedBonus: 0, productivityBonus: 0 },
    constants: {
      max: 2,
      stone: 1,
      steel: 2,
      electric: 2,
    },
    number: value => value,
    patterns: modulePatterns,
  })(input);
}

export function coerceMineSpeed(input: string): SpeedMultiplier {
  return coerceSpeed({
    label: 'mine speed',
    base: { base: 0.5, speedBonus: 0.3, productivityBonus: 0 },
    constants: {
      max: 0.5,
      burner: 0.25,
      electric: 0.5,
    },
    percent: value => 0.5 * (1 + value / 100),
    number: value => 0.5 * value,
    patterns: modulePatterns,
  })(input);
}
