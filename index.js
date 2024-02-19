import fs from 'fs/promises'

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

const heavy_craft = async (thing1, thing2) => {
  const key = [thing1, thing2].sort().join(';');
  if(combinations.has(key)) {
    console.log(`${thing1} + ${thing2} has already been tried`);
    return null;
  }
  const { result } = await craft(thing1, thing2);
  const log_message = `${thing1} + ${thing2} = ${result}`;
  console.info(log_message);
  await append_log_entry(log_message);
  combinations.set(key, result);
  await sleep(200 + Math.random() * 50);
  return result;
}

const weight_map_fn = weight => (Math.pow(weight, 1.9) / 5.3)

const weighted_random = item_weights => {
  if(!Array.isArray(item_weights) || item_weights.length === 0)
    throw new Error('item_weights must be a valid array of non-zero length');
  const cumulativeWeights = [];
  for(const [_, weight] of item_weights)
    cumulativeWeights.push((weight_map_fn(weight) * 100) + (cumulativeWeights.at(-1) ?? 0));
  const random_number = Math.random() * cumulativeWeights.at(-1);
  for(let i = 0; i < item_weights.length; i++)
    if(cumulativeWeights[i] >= random_number) return item_weights[i][0];
}

const item_weights = {
  popularity: new Map(items.map(item => [item, 3])),
};
while(true) {
  console.log([...item_weights.popularity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5));
  let e1 = weighted_random([...item_weights.popularity.entries()]);
  let e2 = pick_from_array(items); // FIXME: ONLY PICK THINGS THAT HAVEN'T BEEN TRIED YET!!!!
  if(item_weights.popularity.get(e2) > item_weights.popularity.get(e1))
    [e1, e2] = [e2, e1]; // e1 should always be more "popular"
  const item = await heavy_craft(e1, e2);
  if(item === 'Nothing' || !item)
    continue;
  let e1_pop = item_weights.popularity.get(e1);
  let e2_pop = item_weights.popularity.get(e2);
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
    item_weights.popularity.set(item, 10); // Set it high, so that it's more likely to be tested out quickly to determine if it's good
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
  item_weights.popularity.set(e1, Math.min(e1_pop, 20));
  item_weights.popularity.set(e2, Math.min(e2_pop, 20));
}
