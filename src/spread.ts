import { map, mean, chunk, flatMap } from "lodash";

function randomFill(length: number) {
  return map(Array(length), Math.random);
}

function averageDifference(values: number[]) {
  const average = mean(values);
  const differences = map(values, value => Math.abs(value - average));
  return mean(differences);
}

function averageAll(values: number[], startIndex: number): number[] {
  const prefix = values.slice(0, startIndex);
  const endIndex = values.length - (values.length - startIndex) % 2;
  const suffix = values.slice(endIndex);
  const middle = values.slice(startIndex, endIndex);
  const averaged = flatMap(map(chunk(middle, 2), mean), a => [a, a]);
  return [...prefix, ...averaged, ...suffix];
}

function simpleRows() {
  const beltCount = 18;
  const rows = 20;
  // const belts = randomFill(beltCount);
  const belts = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  let lastBeltLayout = belts;
  const layouts = map(Array(rows), (_, index) => {
    const newLayout = averageAll(lastBeltLayout, index % 2);
    lastBeltLayout = newLayout;
    return newLayout;
  });
  const differences = map(layouts, averageDifference);
  console.log(map(differences, d => d.toFixed(2)).join('  '));
}

simpleRows();
