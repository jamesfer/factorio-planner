export interface AssemblerQuantity {
  assemblers: number;
}

export interface RateQuantity {
  perSecond: number;
}

export type Quantity = AssemblerQuantity | RateQuantity;

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

export function coerceLabSpeed(input: string): number {
  if (input === 'max') {
    return 3.5;
  }

  if (/^[0-9]+%$/.test(input)) {
    return 1 + +input.slice(0, -1) / 100;
  }

  if (!Number.isNaN(+input)) {
    return +input;
  }

  throw new Error(`Could not handle lab speed input: ${input}`);
}

export function coerceAssemblerSpeed(input: string): number {
  if (input === 'max') {
    return 1.25;
  }

  if (/^(grey|blue|yellow)$/.test(input)) {
    return {
      grey: 0.5,
      blue: 0.75,
      yellow: 1.25,
    }[input];
  }

  if (!Number.isNaN(+input)) {
    return +input;
  }

  throw new Error(`Could not handle assembler speed input: ${input}`);
}

export function coerceFurnaceSpeed(input: string): number {
  if (input === 'max') {
    return 2;
  }

  if (/^(stone|steel|electric)$/.test(input)) {
    return {
      stone: 1,
      steel: 2,
      electric: 2,
    }[input];
  }

  if (!Number.isNaN(+input)) {
    return +input;
  }

  throw new Error(`Could not handle furnace speed input: ${input}`);
}

export function coerceMineSpeed(input: string): number {
  if (input === 'max') {
    // Electric drill with 30% bonus
    return 0.65;
  }

  if (/^(burner|electric)$/.test(input)) {
    return {
      steel: 0.25,
      electric: 0.5,
    }[input];
  }

  if (/^[0-9]+%$/.test(input)) {
    return 0.5 * (1 + +input.slice(0, -1) / 100);
  }

  if (!Number.isNaN(+input)) {
    return 0.5 * +input;
  }

  throw new Error(`Could not handle furnace speed input: ${input}`);
}
