import { Recipe } from './recipes/recipeDatabase';

const uraniumRate = 0.25;
const uranium235Chance = 0.007;
const uranium238Chance = 1 - uranium235Chance;

const uraniumProcessing = {
  time: 12,
  uranium235Chance,
  uranium238Chance,
  uraniumInput: 10,
};

const enrichment = {
  time: 60,
  uranium238Input: 5,
  uranium235Output: 1,
  uranium238Output: 2,
};

const reprocessing = {
  time: 60,
  fuelCellInput: 5,
  uranium238Output: 3,
};

const fuelCellProduction = {
  time: 10,
  uranium235Input: 1,
  uranium238Input: 19,
  fuelCellOutput: 10,
};

const fuelCellEnergy = 8e9;

const reactorEnergy = 40e6;

const heatExchangeEnergy = 10e6;
const heatExchangeSteamOutput = 103;

const turbineSteamConsumption = 60;
const turbineEnergyOutput = 5.82e6;

function main() {
  const mines = +process.argv[2];
  const reactorRowLength = +process.argv[3];

  const uranium = mines * uraniumRate * 1.3;

  const processingCentrifuges = uranium / (uraniumProcessing.uraniumInput / uraniumProcessing.time);

  const uranium235Ratio = fuelCellProduction.uranium238Input / fuelCellProduction.uranium235Input;
  const reprocessingMultiplier = 1 + reprocessing.uranium238Output / reprocessing.fuelCellInput * fuelCellProduction.fuelCellOutput / fuelCellProduction.uranium238Input;
  const enrichmentCentrifugeMultiplier = (reprocessingMultiplier * uraniumProcessing.uranium238Chance / uraniumProcessing.time - uranium235Ratio * uraniumProcessing.uranium235Chance / uraniumProcessing.time)
    / (uranium235Ratio * enrichment.uranium235Output / enrichment.time - reprocessingMultiplier * (enrichment.uranium238Output - enrichment.uranium238Input) / enrichment.time);
  const enrichmentCentrifugeCount = processingCentrifuges * enrichmentCentrifugeMultiplier;

  const uranium238Production = (uraniumProcessing.uranium238Chance / uraniumProcessing.time + enrichmentCentrifugeMultiplier * (enrichment.uranium238Output - enrichment.uranium238Input) / enrichment.time) * reprocessingMultiplier;
  const uranium235Production = uraniumProcessing.uranium235Chance / uraniumProcessing.time + enrichmentCentrifugeMultiplier * enrichment.uranium235Output / enrichment.time;
  const fuelCellAssemblerMultiplier = uranium238Production / (fuelCellProduction.uranium238Input / fuelCellProduction.time);
  const fuelCellAssemblerCount = processingCentrifuges * fuelCellAssemblerMultiplier;

  const reprocessingCentrifugeMultiplier = fuelCellProduction.fuelCellOutput / fuelCellProduction.time / (reprocessing.fuelCellInput / reprocessing.time);
  const reprocessingCount = fuelCellAssemblerCount * reprocessingCentrifugeMultiplier;

  const reactorMultiplier = fuelCellEnergy * fuelCellProduction.fuelCellOutput / fuelCellProduction.time / reactorEnergy;
  const reactorCount = fuelCellAssemblerCount * reactorMultiplier;
  const neighbourBonus = reactorRowLength === 0 ? 1 : reactorRowLength === 1 ? 2 : ((reactorRowLength - 2) * 4 + 2 * 3) / reactorRowLength;
  const heatExchangeCount = reactorCount * reactorEnergy * neighbourBonus / heatExchangeEnergy;
  const turbineCount = heatExchangeCount * heatExchangeSteamOutput / turbineSteamConsumption;

  console.log('Uranium mined:', uranium.toFixed(2), '/s');
  console.log('Processing centrifuges:', processingCentrifuges);
  console.log('Enrichment centrifuges:', enrichmentCentrifugeCount);
  console.log('Reprocessing centrifuges:', reprocessingCount);
  console.log('Fuel cell assemblers:', fuelCellAssemblerCount);
  console.log('Reactors:', reactorCount, `+${neighbourBonus * 100}%`);
  console.log('Heat exchanges:', heatExchangeCount);
  console.log('Turbines:', turbineCount);
  console.log('Energy output:', turbineCount * turbineEnergyOutput / 1e9, 'GW');
}

main();
