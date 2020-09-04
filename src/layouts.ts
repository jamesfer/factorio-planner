import * as chalk from 'chalk';
import { flatMap, zip, map, maxBy, max, min } from 'lodash';
const stripAnsi = require('strip-ansi');

const layouts = [
  {
    name: 'Spaced',
    mines: 2,
    size: 5 * 10,
    coverage: 1,
    beacons: 0,
  },
  {
    name: 'Crowded',
    mines: 2,
    size: 3 * 7,
    coverage: 1,
    beacons: 0,
  },
  {
    name: 'Crowded Beacon',
    mines: 2,
    size: 3 * 10,
    coverage: 1 - 3 / (3 * 10),
    beacons: 4,
  },
  {
    name: 'Pathless tessellation',
    mines: 2,
    size: 2 + 4 * 9,
    coverage: 1 - 2 / (2 + 4 * 9),
    beacons: 5,
  },
  {
    name: 'Double layer beacon',
    mines: 1,
    size: 3 * 10,
    coverage: 1 - 6 / (3 * 10),
    beacons: 8,
  },
];

const variations: { name: string, mineModule?: 'speed' | 'productivity', beaconModule?: 'speed' | 'productivity' }[] = [
  {
    name: 'Base',
  },
  {
    name: 'Speed',
    mineModule: 'speed',
    beaconModule: 'speed',
  },
  {
    name: 'Productivity',
    mineModule: 'productivity',
    beaconModule: 'speed',
  },
];


const minePatchCount = 250_000_000;
const minePatchSize = 350 / (layouts[0].mines / layouts[0].size);
const minePatchDensity = 250_000_000 / 350 * (layouts[0].mines / layouts[0].size);

function mineBonus(module: 'speed' | 'productivity' | undefined): number {
  return module === undefined ? 0 : module === 'speed' ? 0.5 : -0.15;
}

function producedBonus(module: 'speed' | 'productivity'): number {
  return module === undefined ? 0 : module === 'speed' ? 0 : 0.1;
}

function makeCalculations() {
  return flatMap(layouts, (layout) => variations.map((variation) => {
    const mineRate = 0.5 * (1 + mineBonus(variation.mineModule) * 3) * (1 + mineBonus(variation.beaconModule) * layout.beacons);
    const producedRate = mineRate * (1 + producedBonus(variation.mineModule) * 3) * (1 + producedBonus(variation.beaconModule) * layout.beacons);
    const availableResources = minePatchCount * layout.coverage;
    const mineCount = minePatchSize / layout.size * layout.mines;
    const mineOutTime = availableResources / (mineCount * mineRate);
    const mineOutTimeHours = mineOutTime / 60 / 60 / 24;
    const totalProduction = producedRate * mineCount;
    return {
      name: `${layout.name} - ${variation.name}`,
      mines: Math.floor(mineCount),
      rate: +totalProduction.toFixed(0),
      mineOutTime: +mineOutTimeHours.toFixed(1),
      furnaces: {
        base: Math.ceil(totalProduction / 0.625),
        withSpeed: Math.ceil(totalProduction / (0.625 * (1 + 0.5 * 2))),
        withProd: Math.ceil(totalProduction / (0.625 * (1 - 0.15 * 2))),
        withSpeedBeacon: Math.ceil(totalProduction / (0.625 * (1 + 0.5 * 6))),
        withProdAndSpeedBeacon: Math.ceil(totalProduction / (0.625 * (1 + 0.5 * 4 - 0.15 * 2))),
      },
    };
  }));
}

function getBonusDisplay(value: number, base: number, direction: 'minimize' | 'maximize'): string {
  if (value === base) {
    return '';
  }

  const color = direction === 'minimize' && value < base || direction === 'maximize' && value > base
    ? chalk.green
    : chalk.red;
  const variation = value / base - 1;
  return color(`${variation < 0 ? '-' : '+'}${(Math.abs(variation) * 100).toFixed(0)}%`)
}

function addBonusDisplay(value: number, base: number, direction: 'minimize' | 'maximize'): string {
  return `${value} ${getBonusDisplay(value, base, direction)}`;
}

function toTable(data: ReturnType<typeof makeCalculations>): { cells: string[][], headings: string[] } {
  const base = data[3];
  const headings = ['Name', 'Mines', 'Rate', 'Time', 'F Base', 'F + Speed', 'F + Prod', 'F + Speed Beacon', 'F + Prod + Speed Beacon'];
  const cells = data.map((layout) => {
    return [
      layout.name,
      addBonusDisplay(layout.mines, base.mines, 'maximize'),
      addBonusDisplay(layout.rate, base.rate, 'maximize'),
      addBonusDisplay(layout.mineOutTime, base.mineOutTime, 'minimize'),
      addBonusDisplay(layout.furnaces.base, base.furnaces.base, 'minimize'),
      addBonusDisplay(layout.furnaces.withSpeed, base.furnaces.base, 'minimize'),
      addBonusDisplay(layout.furnaces.withProd, base.furnaces.base, 'minimize'),
      addBonusDisplay(layout.furnaces.withSpeedBeacon, base.furnaces.base, 'minimize'),
      addBonusDisplay(layout.furnaces.withProdAndSpeedBeacon, base.furnaces.base, 'minimize'),
    ];
  });
  return { headings, cells };
}

function printTable(headings: string[], cells: string[][]): string {
  const maxLengths = zip(headings, ...cells).map((col: string[]): number => max(map(map(col, stripAnsi), 'length')));
  const [paddedHeadings, ...paddedCells] = [headings, ...cells].map(row => row.map((cell, index) => cell.padEnd(maxLengths[index] + (cell.length - stripAnsi(cell).length), ' ')));
  return [paddedHeadings, ...paddedCells].map(row => row.join(' | ')).join('\n');
}

function main() {
  const { headings, cells } = toTable(makeCalculations());
  return printTable(headings, cells);
}

console.log(main());
