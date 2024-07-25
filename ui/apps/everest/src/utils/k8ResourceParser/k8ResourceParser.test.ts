import { cpuParser, memoryParser } from '.';

describe('cpu parser', () => {
  // pattern is [description, input, output]
  const tests: [string, string, number][] = [
    ['parses full numbers', '1', 1],
    ['parses floats (< 1)', '1.5', 1.5],
    ['parses floats (> 1)', '0.5', 0.5],
    ['parses strings with milli (m) unit (whole number)', '1000m', 1],
    ['parses strings with milli (m) unit (decimal number)', '1300m', 1.3],
    ['parses strings with milli (m) unit (< 1)', '300m', 0.3],
  ];

  tests.map((t) =>
    it(`${t[0]} (${t[1]} to ${t[2]})`, () => {
      expect(cpuParser(t[1])).toEqual(t[2]);
    })
  );
});

describe('memory parser', () => {
  // pattern is [description, input, output]
  const tests: [string, string, number][] = [
    ['parses full numbers', '1', 1],
    ['parses kilo strings', '1k', 1 * 10 ** -6],
    ['parses Mega strings', '2M', 2 * 10 ** -3],
    ['parses Giga strings', '3G', 3],
    ['parses Tera strings', '4T', 4 * 1000],
    ['parses Peta strings', '5P', 5 * 1000 ** 2],
    ['parses Exa strings', '6E', 6 * 1000 ** 3],
    ['parses kibi strings', '1Ki', 1 * (1024 * 10 ** -9)],
    ['parses Mebi strings', '2Mi', 2 * (1024 ** 2 * 10 ** -9)],
    ['parses Gibi strings', '3Gi', 3 * (1024 ** 3 * 10 ** -9)],
    ['parses Tebi strings', '4Ti', 4 * (1024 ** 4 * 10 ** -9)],
    ['parses Pebi strings', '5Pi', 5 * (1024 ** 5 * 10 ** -9)],
    ['parses Exbi strings', '6Ei', 6 * (1024 ** 6 * 10 ** -9)],
  ];

  tests.map((t) =>
    it(`${t[0]} (${t[1]} to ${t[2]})`, () => {
      expect(memoryParser(t[1])).toEqual(t[2]);
    })
  );
});
