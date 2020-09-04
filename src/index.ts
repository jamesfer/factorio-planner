import * as chalk from 'chalk';
import {
  filter,
  find,
  findIndex,
  flatMap,
  forEach,
  map,
  max,
  maxBy,
  mean,
  pickBy,
  range,
  sum,
  uniqBy,
  sumBy,
} from 'lodash';
import * as yargs from 'yargs';
import {
  coerceAssemblerSpeed,
  coerceFurnaceSpeed,
  coerceLabSpeed,
  coerceMineSpeed,
  coerceQuantity, SpeedMultiplier,
} from './cli/coercions';
import { createDependencyTree } from './dependencies/createDependencyTree';
import { findAvailableDependents } from './dependencies/findAvailableDependents';
import { findIndependentTrees } from './dependencies/independentDependencies';
import { findRecipe } from './recipes/findRecipe';
import { Recipe } from './recipes/recipeDatabase';

export interface Dependency {
  name: string;
  dependents: string[];
}

export type DependencyTree = Dependency[];

interface ProductionSetup {
  count: number;
  efficiency: number;
  consumed: number;
  produced: number;
  recipe: Recipe;
}

export interface ProductionLineSetup {
  [k: string]: ProductionSetup;
}

interface ProductionSpeedMultipliers {
  assembler: SpeedMultiplier;
  mine: SpeedMultiplier;
  lab: SpeedMultiplier;
  pump: SpeedMultiplier;
  chem: SpeedMultiplier;
  furnace: SpeedMultiplier;
  'rocket silo': SpeedMultiplier;
}

const BASE_SPEED_MULTIPLIER: SpeedMultiplier = {
  base: 1,
  productionBonus: 0,
};

function getSpeedMultiplier(source: Recipe['source'], productionSpeeds: ProductionSpeedMultipliers): SpeedMultiplier {
  if (source === 'none') {
    return BASE_SPEED_MULTIPLIER;
  }

  return productionSpeeds[source];
}

function getBaseSpeedMultiplier(source: Recipe['source'], productionSpeeds: ProductionSpeedMultipliers): number {
  return getSpeedMultiplier(source, productionSpeeds).base;
}

function getProductionSpeedMultiplier(source: Recipe['source'], productionSpeeds: ProductionSpeedMultipliers): number {
  const multipliers = getSpeedMultiplier(source, productionSpeeds);
  return multipliers.base + multipliers.productionBonus;
}

function calculateRequirementConsumed(recipe: Recipe, requirement: { name: string, amount: number }, productionSpeeds: ProductionSpeedMultipliers): number {
  const speedMultiplier = getBaseSpeedMultiplier(recipe.source, productionSpeeds);
  return requirement.amount / recipe.time * speedMultiplier;
}

function calculateRequirementConsumedInSetup(assembler: ProductionSetup, requirement: { name: string, amount: number }, productionSpeeds: ProductionSpeedMultipliers): number {
  return assembler.efficiency * assembler.count * calculateRequirementConsumed(assembler.recipe, requirement, productionSpeeds);
}

function calculateProductionRate(recipe: Recipe, speeds: ProductionSpeedMultipliers) {
  return recipe.yield * getProductionSpeedMultiplier(recipe.source, speeds) / recipe.time
}

function calculateTotalProductionRate(productionMachines: number, recipe: Recipe, speeds: ProductionSpeedMultipliers) {
  return productionMachines * calculateProductionRate(recipe, speeds);
}

function calculateRequiredMachines(rate: number, recipe: Recipe, speeds: ProductionSpeedMultipliers): number {
  return rate * recipe.time / recipe.yield / getProductionSpeedMultiplier(recipe.source, speeds);
}

function calculateProductionSetup(recipeName: string, productionLineSetup: ProductionLineSetup, productionSpeeds: ProductionSpeedMultipliers): ProductionSetup {
  const recipe = findRecipe(recipeName);

  // Find the number of resources consumed by existing producers
  const totalAmountConsumed = sum(map(productionLineSetup, (assembler): number => {
    const requirement = find(assembler.recipe.requirements, { name: recipeName });
    if (!requirement) {
      return 0;
    }
    return calculateRequirementConsumedInSetup(assembler, requirement, productionSpeeds);
  }));

  // Determine the amount of producers of this recipe required to meet the demand
  const requiredProductionMachines = calculateRequiredMachines(totalAmountConsumed, recipe, productionSpeeds);
  const requiredAssemblerCount = Math.ceil(requiredProductionMachines);
  const actualProduction = requiredAssemblerCount * calculateProductionRate(recipe, productionSpeeds);

  return {
    recipe,
    count: requiredAssemblerCount,
    efficiency: Math.min(1, requiredProductionMachines / requiredAssemblerCount),
    consumed: totalAmountConsumed,
    produced: actualProduction,
  }
}

function findSetupUsingDependencyTree(recipe: Recipe, rate: number, dependencyTree: DependencyTree, productionSpeeds: ProductionSpeedMultipliers): ProductionLineSetup {
  const machines = Math.ceil(calculateRequiredMachines(rate, recipe, productionSpeeds));
  const produced = calculateTotalProductionRate(machines, recipe, productionSpeeds);
  const productionLineSetup: ProductionLineSetup = {
    [recipe.name]: {
      recipe,
      count: machines,
      efficiency: rate / produced,
      consumed: rate,
      produced: produced,
    },
  };
  let remainingDependencies = dependencyTree;
  while (remainingDependencies.length > 0) {
    const availableDependencies = findAvailableDependents(remainingDependencies, productionLineSetup);
    if (availableDependencies.length === 0) {
      throw new Error('No available dependencies could be found');
    }

    availableDependencies.forEach((availableDependency) => {
      const setup = calculateProductionSetup(availableDependency.name, productionLineSetup, productionSpeeds);
      productionLineSetup[availableDependency.name] = setup;
    });

    remainingDependencies = remainingDependencies.filter(remaining => (
      !find(availableDependencies, { name: remaining.name })
    ));
  }
  return productionLineSetup;
}

function findSetup(recipe: Recipe, rate: number, productionSpeeds: ProductionSpeedMultipliers): ProductionLineSetup {
  return findSetupUsingDependencyTree(recipe, rate, createDependencyTree(recipe), productionSpeeds);
}

// function findSetups(recipe: Recipe, maxRootCount: number, productionSpeeds: ProductionSpeedMultipliers): ProductionLineSetup[] {
//   const dependencyTree = createDependencyTree(recipe);
//   return range(1, maxRootCount + 1).map((i) => findSetupUsingDependencyTree(recipe, i, dependencyTree, productionSpeeds));
// }

function calculateTotalSetupEfficiency(setup: ProductionLineSetup): number {
  return mean(map(setup, 'efficiency'));
}

// function findBestSetup(recipe: Recipe, maxOutputCount: number, productionSpeeds: ProductionSpeedMultipliers) {
//   const setups = findSetups(recipe, maxOutputCount, productionSpeeds);
//   return maxBy(map(setups, setup => ({ setup, efficiency: calculateTotalSetupEfficiency(setup) })), 'efficiency');
// }

function toCsv(primaryName: string, setups: ProductionLineSetup[]): string {
  let output = 'Output count,Efficiency\n';
  setups.forEach((setup) => {
    output += setup[primaryName].count;
    output += ',';
    output += mean(map(setup, 'efficiency'));
    output += '\n';
  });
  return output;
}

function displayPossibleFraction(number: number): string {
  return Number.isInteger(number) ? `${number}` : number.toFixed(1);
}

function containsProductOf(setup: ProductionLineSetup, source: Recipe['source']): boolean {
  return filter(setup, assemblerSetup => assemblerSetup.recipe.source === source).length > 0;
}

function displaySetup(setup: ProductionLineSetup, source: Recipe['source'] = 'assembler'): string {
  const filteredSetup = pickBy(setup, assemblerSetup => assemblerSetup.recipe.source === source);
  const maxNameLength: number = maxBy(map(filteredSetup, 'recipe.name.length'));
  const maxCountLength: number = max(map(filteredSetup, assembler => assembler.count.toString().length));
  const setupLines = map(filteredSetup, (assembler, name) => {
    return `${name.padStart(maxNameLength, ' ')}  ${assembler.count.toString().padEnd(maxCountLength, ' ')}  ${(assembler.efficiency * 100).toFixed(0)}% (${displayPossibleFraction(assembler.consumed)}/${displayPossibleFraction(assembler.produced)})`;
  });
  return [
    ...setupLines,
    `${'Total'.padEnd(maxNameLength, ' ')}  ${sumBy(Object.values(filteredSetup), 'count')}`,
  ].join('\n');
}

function displayInTable(rows: string[][]): string {
  if (rows.length === 0) {
    return '';
  }

  const columns = rows[0].length;
  const maxLengths = range(columns).map(i => max(map(rows, `${i}.length`)));
  return rows.map(row => row.map((value, index) => value.padEnd(maxLengths[index], ' ')).join('  ')).join('\n');
}

function makeBeltIcon(capacity: number, items: number): string {
  // return {
  //   0: '[  |  ]',
  //   1: '[\u2588 |  ]',
  //   2: '[\u2588\u2588|  ]',
  //   3: '[\u2588\u2588|\u2588 ]',
  //   4: '[\u2588\u2588|\u2588\u2588]',
  // }[Math.min(4, Math.ceil(items / capacity / 4))];
  if (items > capacity) {
    const fullBeltCount = Math.ceil(items / capacity);
    return `${fullBeltCount} x \u2588`;
  }

  return {
    0: '',
    1: '\u2582',
    2: '\u2584',
    3: '\u2586',
    4: '\u2588',
  }[Math.min(4, Math.ceil(items * 4 / capacity))];
}

function makeTrainIcon(itemsPerSecond: number) {
  const itemsPerMinute = itemsPerSecond * 60;
  const trains = Math.ceil(itemsPerMinute / (40 * 100));
  return `${trains} x 🚅/m`;
}

function displayBeltCapacity(itemsPerSecond: number): string {
  if (itemsPerSecond <= 15) {
    return chalk.yellow(makeBeltIcon(15, itemsPerSecond));
  }
  if (itemsPerSecond <= 30) {
    return chalk.red(makeBeltIcon(30, itemsPerSecond));
  }

  const blueBelt = chalk.blue(makeBeltIcon(45, itemsPerSecond));
  if (itemsPerSecond < 70) {
    return blueBelt;
  }
  return `${blueBelt} ${makeTrainIcon(itemsPerSecond)}`;
}

function displayRawRequirements(setup: ProductionLineSetup, displaySources: Recipe['source'][], primaryRecipe: string, productionSpeeds: ProductionSpeedMultipliers): string {
  let rawMaterials: { [k: string]: number } = {};
  forEach(setup, (assemblerSetup) => {
    const recipe = assemblerSetup.recipe;
    if (displaySources.includes(recipe.source)) {
      forEach(recipe.requirements, (requirement) => {
        const requirementRecipe = findRecipe(requirement.name);
        if (!displaySources.includes(requirementRecipe.source)) {
          const amount = calculateRequirementConsumedInSetup(assemblerSetup, requirement, productionSpeeds);
          rawMaterials[requirement.name] = (rawMaterials[requirement.name] || 0) + amount;
        }
      });

      // if (recipe.name in rawMaterials) {
      //   rawMaterials[recipe.name] += amount;
      // } else {
      //   rawMaterials[recipe.name] = amount;
      // }
    }
    // recipe.requirements.forEach((requirement) => {
    //   const amount = requirement.amount * assemblerSetup.count / recipe.time;
    //   if (requirement.name in rawMaterials) {
    //     rawMaterials[requirement.name] += amount;
    //   } else {
    //     rawMaterials[requirement.name] = amount;
    //   }
    // });
  });

  // const maxNameLength = maxBy(Object.keys(rawMaterials), 'length');
  // const maxCountLength = maxBy(Object.values(rawMaterials), value => value.toString().length + 2)

  const tableData = map(rawMaterials, (amount, name) => [name, `${Math.ceil(amount)}/s`, displayBeltCapacity(amount)]);
  return displayInTable(tableData);
  // return map(rawMaterials, (amount, name) => `  ${name}: ${Math.ceil(amount * 60)}/m`).join('\n');
}

function displayDependencyData(recipe: Recipe, sources: Recipe['source'][]) {
  const dependencyGraph = createDependencyTree(recipe);
  const independent = findIndependentTrees(recipe, sources);
  const sourceDependencies = dependencyGraph.filter(dependency => (
    sources.includes(findRecipe(dependency.name).source)
      && (!independent.includes(dependency.name) || dependency.dependents.length > 1)
      && (dependency.dependents.length <= 4)
      // || dependency.dependents.some(dependent => sources.includes(findRecipe(dependent).source))
  ));

  const displayedDependencyNames = flatMap(
    dependencyGraph.filter(dependency => sources.includes(findRecipe(dependency.name).source)),
    dependency => [dependency.name, ...dependency.dependents],
  );
  // console.log(displayedDependencyNames);

  // const sourceDependencies = dependencyGraph.filter(dependency => displayedDependencyNames.includes(dependency.name));
  const nodes = [
    { id: -1, label: recipe.name },
    ...sourceDependencies.map((dependency, index) => ({ id: index, label: dependency.name }))
  ];
  const edges = flatMap(sourceDependencies, (dependency, index) => dependency.dependents
    .filter(dependent => dependent === recipe.name || findIndex(sourceDependencies, { name: dependent }))
    .map(dependent => ({
      to: index,
      from: findIndex(sourceDependencies, { name: dependent }),
    }))
  );
  const uniqueEdges = uniqBy(edges, JSON.stringify);

  return `const nodes = new vis.DataSet(${JSON.stringify(nodes)}), edges = new vis.DataSet(${JSON.stringify(uniqueEdges)});`;
}

function displayAssemblerIO(setup: ProductionSetup, speeds: ProductionSpeedMultipliers): string {
  const messages: string[] = [];
  const recipe = setup.recipe;

  const liquids = ['Petroleum', 'Water', 'Light Oil', 'Heavy Oil', 'Lubricant', 'Sulfuric Acid'];
  const requirementsWithCount = [
    { name: 'Products', rate: calculateProductionRate(recipe, speeds) },
    ...map(recipe.requirements.filter(req => !liquids.includes(req.name)), requirement => ({
      name: requirement.name,
      rate: calculateRequirementConsumed(recipe, requirement, speeds),
    })),
  ];
  const highestSupplyRate = maxBy(requirementsWithCount, 'rate');
  const maxAssemblers = Math.floor(45 / highestSupplyRate.rate);

  messages.push(`Per row ${maxAssemblers} (${(setup.count / maxAssemblers).toFixed(1)}) constrained by ${highestSupplyRate.name}`);

  requirementsWithCount.forEach(({ name, rate }) => {
    const longInserterCount = Math.ceil(rate / 3.46);
    const fastInserterCount = Math.ceil(rate / 6.43);
    const stackInserterCount = Math.ceil(rate / 15);
    const inserterDisplay = longInserterCount === 1 ? chalk.red('LI')
      : fastInserterCount === 1 ? chalk.blue('FI')
      : stackInserterCount === 1 ? chalk.green('SI')
      : chalk.green(`${stackInserterCount}xSI`);
    const beltCapacityDisplay = `${displayBeltCapacity(rate * maxAssemblers)} (${displayBeltCapacity(rate * setup.count)})`;
    messages.push(`${name} ${inserterDisplay} ${beltCapacityDisplay}`);
  });
  return messages.join('\n');
}

function displayIO(setup: ProductionLineSetup, displayedSources: Recipe['source'][], speeds: ProductionSpeedMultipliers): string {
  const messages: string[] = [];
  for (const name in setup) {
    if (setup[name].recipe.requirements.length > 0 && displayedSources.includes(setup[name].recipe.source)) {
      messages.push(`  ${name} x${setup[name].count}`);
      messages.push(displayAssemblerIO(setup[name], speeds).split('\n').map(line => `    ${line}`).join('\n'));
    }
  }
  return messages.join('\n');
}

function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'd': {
      const command = yargs.command(
        'd <recipe>',
        'd',
        y => y
          .positional('recipe', {
            type: 'string',
            demandOption: true,
          })
          .coerce('recipe', findRecipe)
          .option('quantity', {
            alias: ['q'],
            string: true,
            demandOption: true,
          })
          .coerce('quantity', coerceQuantity)
          .option('displayRaw', {
            boolean: true,
            default: true,
          })
          .option('displayEfficiency', {
            boolean: true,
            default: true,
          })
          .option('displayAssemblers', {
            boolean: true,
            default: true,
          })
          .option('displayRocketSilos', {
            boolean: true,
            default: true,
          })
          .option('displayFurnaces', {
            boolean: true,
            default: false,
          })
          .option('displayChemicals', {
            boolean: true,
            default: false,
          })
          .option('displayMines', {
            boolean: true,
            default: false,
          })
          .option('displayLabs', {
            boolean: true,
            default: false,
          })
          .option('labSpeed', {
            string: true,
            // default: coerceLabSpeed('max'),
            default: 'max',
            coerce: coerceLabSpeed,
          })
          .option('mineSpeed', {
            string: true,
            // default: coerceMineSpeed('max'),
            default: 'max',
            coerce: coerceMineSpeed,
          })
          .option('assemblerSpeed', {
            string: true,
            // default: coerceAssemblerSpeed('max'),
            default: 'max',
            coerce: coerceAssemblerSpeed,
          })
          .option('furnaceSpeed', {
            string: true,
            // default: coerceFurnaceSpeed('max'),
            default: 'max',
            coerce: coerceFurnaceSpeed,
          })
          .option('displayDependencyData', {
            boolean: true,
            default: false,
          })
          .option('displayIO', {
            boolean: true,
            default: false,
          }),
      );
      const args = command.argv;

      const speeds: ProductionSpeedMultipliers = {
        pump: BASE_SPEED_MULTIPLIER,
        chem: BASE_SPEED_MULTIPLIER,
        assembler: args.assemblerSpeed as any as SpeedMultiplier,
        lab: args.labSpeed as any as SpeedMultiplier,
        mine: args.mineSpeed as any as SpeedMultiplier,
        furnace: args.furnaceSpeed as any as SpeedMultiplier,
        'rocket silo': BASE_SPEED_MULTIPLIER,
      };

      // const speedMultiplier = getSpeedMultiplier(args.recipe.source, speeds);
      // const maxCount = 'assemblers' in args.quantity
      //   ? args.quantity.assemblers
      //   : Math.ceil(args.quantity.perSecond * args.recipe.time / speedMultiplier / args.recipe.yield);
      const rate = 'assemblers' in args.quantity
        ? calculateTotalProductionRate(args.quantity.assemblers, args.recipe, speeds)
        : args.quantity.perSecond;
      const setup = findSetup(args.recipe, rate, speeds);

      if (args.displayLabs && containsProductOf(setup, 'lab')) {
        console.log();
        console.log('Lab Setup');
        console.log(displaySetup(setup, 'lab'));
      }

      if (args.displayRocketSilos && containsProductOf(setup, 'rocket silo')) {
        console.log();
        console.log('Rocket Silo Setup');
        console.log(displaySetup(setup, 'rocket silo'));
      }

      if (args.displayAssemblers && containsProductOf(setup, 'assembler')) {
        console.log();
        console.log('Assembler Setup');
        console.log(displaySetup(setup, 'assembler'));
      }

      if (args.displayChemicals && containsProductOf(setup, 'chem')) {
        console.log();
        console.log('Chemical Plant Setup');
        console.log(displaySetup(setup, 'chem'));
      }

      if (args.displayFurnaces && containsProductOf(setup, 'furnace')) {
        console.log();
        console.log('Furnace Setup');
        console.log(displaySetup(setup, 'furnace'));
      }

      if (args.displayMines && containsProductOf(setup, 'mine')) {
        console.log();
        console.log('Mine Setup');
        console.log(displaySetup(setup, 'mine'));
      }

      // if (args.displayEfficiency) {
      //   console.log();
      //   console.log(`Overall efficiency ${(efficiency * 100).toFixed(0)}%`);
      // }

      const displayMap: { [k in Recipe['source']]: boolean } = {
        assembler: args.displayAssemblers,
        'rocket silo': args.displayRocketSilos,
        furnace: args.displayFurnaces,
        lab: args.displayLabs,
        mine: args.displayMines,
        chem: args.displayChemicals,
        pump: false,
        none: false,
      };
      const displayedSources: Recipe['source'][] = Object.keys(displayMap).filter(key => displayMap[key]) as any[];

      if (args.displayRaw) {
        console.log();
        console.log('Raw materials');
        console.log(displayRawRequirements(setup, displayedSources, args.recipe.name, speeds));
      }

      if (args.displayDependencyData) {
        console.log();
        console.log('Dependency Data');
        console.log(displayDependencyData(args.recipe, displayedSources));
      }

      if (args.displayIO) {
        console.log();
        console.log('Inputs and Outputs');
        console.log(displayIO(setup, displayedSources, speeds));
      }

      // depGraphPerms(args.recipe);
      // const independentTrees = findIndependentTrees(args.recipe, displayedSources);
      // console.log(independentTrees);
      // console.log(permDeps(args.recipe, independentTrees));

      break;
    }

    default:
      throw new Error(`Unknown command ${command}`);
  }
}

main();
