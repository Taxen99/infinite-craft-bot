import assert from 'assert';
import fs from 'fs/promises'
import { argv, exit } from 'process';

const LOG_FILE = `combinations_${Date.now().toString().slice(6)}.log`;

const append_log_entry = entry => fs.appendFile(LOG_FILE, entry + '\n');

const combinations = new Map();
const items = ['Water', 'Fire', 'Wind', 'Earth'];

const sleep = ms => new Promise(resolve => setTimeout(_ => resolve(), ms));

const pick_from_array = array => array[Math.floor(Math.random() * array.length)];

const craft = async (e1, e2) => {
  const res = await fetch(`https://neal.fun/api/infinite-craft/pair?first=${encodeURIComponent(e1)}&second=${encodeURIComponent(e2)}`, {
      "headers": {
      "accept": "*/*",
      "accept-language": "en-GB,en;q=0.8",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Brave\";v=\"121\", \"Chromium\";v=\"121\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-gpc": "1",
      "Referer": "https://neal.fun/infinite-craft/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    "body": null,
    "method": "GET"
  });
  if(res.status !== 200) {
    throw new Error(`Got ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if(!json.result) {
    throw new Error(`json.result is falsy: ${json.result}`);
  }
  return json;
};

const SILENT = argv[2] === '--silent';
const heavy_craft = async (thing1, thing2) => {
  const key = [thing1, thing2].sort().join(';');
  if(combinations.has(key)) {
    console.log(`${thing1} + ${thing2} has already been tried`);
    return null;
  }
  const { result } = await craft(thing1, thing2);
  const log_message = `${thing1} + ${thing2} = ${result}`;
  console.info(log_message);
  if(!SILENT)
    await append_log_entry(log_message);
  combinations.set(key, result);
  await sleep(300 + Math.random() * 50);
  return result;
}

const weight_map_fn = weight => (Math.pow(weight, 1.9) / 5.3)

const weighted_random = item_weights => {
  if(!Array.isArray(item_weights) || item_weights.length === 0)
    throw new Error('item_weights must be a valid array of non-zero length');
  const cumulativeWeights = [];
  for(const [_, weight] of item_weights)
    cumulativeWeights.push(Math.round(weight_map_fn(weight) * 100) + (cumulativeWeights.at(-1) ?? 0));
  const random_number = Math.random() * cumulativeWeights.at(-1);
  for(let i = 0; i < item_weights.length; i++)
    if(cumulativeWeights[i] >= random_number) return item_weights[i][0];
  console.error('BAD');
  console.log(random_number, cumulativeWeights, item_weights, [...item_weights.values()].map(weight_map_fn));
}

const map_sum = map => {
  let total = 0;
  for(const val of map.values()) {
    total += val;
  }
  return total;
}

const add_weight = (weights, key, constraint = DEFAULT_CONSTRAINT) => {
  let total_popularity = map_sum(weights);
  if(weights.size === 0) {
    weights.set(key, constraint);
    return;
  }
  assert(Math.abs(total_popularity - constraint) < 0.01);
  const new_weight = constraint / (weights.size + 1); // TODO: use median??
  for(const [key, value] of weights.entries()) {
    // weights.set(key, value - (new_weight / weights.size));
    weights.set(key, value - (value * (new_weight / total_popularity)));
    }
  weights.set(key, new_weight);
  total_popularity = map_sum(weights); // FIXME: remove
  assert(Math.abs(total_popularity - constraint) < 0.01);
  return new_weight;
}

const DEFAULT_CONSTRAINT = 100;
const change_weight = (weights, key, inc, constraint = DEFAULT_CONSTRAINT) => {
  assert(weights.has(key));
  let total_popularity = map_sum(weights);
  const old = weights.get(key);
  const new_weight = Math.min(old + inc, constraint); // FIXME: fix
  const delta = new_weight - old;
  for (const [key_, value] of weights.entries()) {
    weights.set(key_, value - (value * (delta / (total_popularity - old))));
  }
  weights.set(key, new_weight);
  total_popularity = map_sum(weights); // FIXME: remove
  if (!(Math.abs(total_popularity - constraint) < 0.01)) {
    console.log('BAD', weights, old, new_weight, delta, total_popularity, weights);
  }
  assert(Math.abs(total_popularity - constraint) < 0.01);
  return new_weight;
}

const item_weights = {
  popularity: new Map(),
};

for(const base_item of items) {
  add_weight(item_weights.popularity, base_item);
}

while(true) {
  const total_popularity = map_sum(item_weights.popularity);
  console.log(`total_popularity = ${total_popularity}`, [...item_weights.popularity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15));
  let e1 = weighted_random([...item_weights.popularity.entries()]);
  if(!e1)
    assert(false);
  let e2 = pick_from_array(items); // FIXME: ONLY PICK THINGS THAT HAVEN'T BEEN TRIED YET!!!!
  if(item_weights.popularity.get(e2) > item_weights.popularity.get(e1))
    [e1, e2] = [e2, e1]; // e1 should always be more "popular"
  const item = await heavy_craft(e1, e2);
  if(item === 'Nothing' || !item)
    continue;
  let e1_pop = item_weights.popularity.get(e1);
  let e2_pop = item_weights.popularity.get(e2);
  const old_e1_pop = e1_pop; // FIXME: this ols system is shit
  const old_e2_pop = e2_pop;
  if(items.includes(item)) {
    if(e1_pop - e2_pop > 5) {
      e1_pop *= 0.95;
      e2_pop *= 0.7;
    } else if(e1_pop - e2_pop > 3) {
      e1_pop *= 0.9;
      e2_pop *= 0.8;
    } else {
      e1_pop *= 0.8;
      e2_pop *= 0.8;
    }
  } else {
    items.push(item);
    // item_weights.popularity.set(item, 10); // Set it high, so that it's more likely to be tested out quickly to determine if it's good
    add_weight(item_weights.popularity, item);
    if(e1_pop - e2_pop > 5) {
      e1_pop *= 1.2;
      e2_pop *= 1.05;
    } else if(e1_pop - e2_pop > 3) {
      e1_pop *= 1.2;
      e2_pop *= 1.05;
    } else {
      e1_pop *= 1.08;
      e2_pop *= 1.08;
    }
  }
  // item_weights.popularity.set(e1, Math.min(e1_pop, 20));
  // item_weights.popularity.set(e2, Math.min(e2_pop, 20));
  change_weight(item_weights.popularity, e1, e1_pop - old_e1_pop);
  change_weight(item_weights.popularity, e1, e2_pop - old_e2_pop);
}
