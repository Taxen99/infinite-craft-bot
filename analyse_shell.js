import fs from 'fs/promises'
import { argv } from 'process'
import { ask_once } from './user-input.js';
import create_analyser from './analyse_lib.js';

if(!argv[2])
  throw new Error('must specify path to log');

const contents = (await fs.readFile(argv[2])).toString();
const lookup_ingredients = create_analyser(contents);
while(true) {
  const input = await ask_once('> ');
  /*if(!ingredients.has(input)) {
    console.error('no recipe for ' + input);
    continue;
  }*/
  lookup_ingredients(input);
}
