export default function create_analyser(contents) {
  const things = new Set(contents.split(/\+|=|\n/).filter(word => word !== 'Nothing' && word.trim() !== '').map(word => word.trim()));

  const base_things = ['Earth', 'Fire', 'Water', 'Wind'];
  // const connected_to_base_things = base_things.slice().map(thing => ({thing, distance: 0}));
  const distance_from_base = new Map(base_things.slice().map(thing => [thing, 0]));

  const lines = contents.split('\n');
  lines.pop();
  // const ingredients = new Map(lines.map(line => [line.split('=').at(1).trim(), line.split('=').at(0).split('+').map(thing => thing.trim())]));
  const recipes = new Map(lines.map(line => [line.split('=').at(0).split('+').map(thing => thing.trim()).join(';'), line.split('=').at(1).trim()]));
  const ingredients = new Map();
  while(true) {
    for(const [key, val] of recipes) {
      // if(val === 'Fish') console.log(key.replace(';', ' + '));
      // if(distance_from_base.has(val) && distance_from_base.get(val) ---- ) continue;
      const [first, second] = key.split(';');
      if(distance_from_base.has(first) || distance_from_base.has(second)) { // FIXME: I think this check is redundant
        const new_distance = distance_from_base.get(first) + distance_from_base.get(second) + 1;
        if(distance_from_base.has(val) && distance_from_base.get(val) <= new_distance) continue; // The previous path was better
        ingredients.set(val, [first, second]);
        distance_from_base.set(val, new_distance); // TODO: Now actually use the distance
      }
    }
    break;
  /*  if(connected_to_base_things.length === things.size) {
      break;
    } else {
      console.log(connected_to_base_things.length, things.size);
    }*/
  }
  
  const default_callback = ({ item, first, second }) => {
    console.log(`${item} = ${first} + ${second}`);
  }

  const lookup_ingredients = (thing, callback = default_callback, already_listed = []) => {
    if(base_things.includes(thing) || already_listed.includes(thing))
      return;
    already_listed.push(thing);
    if(ingredients.has(thing)) {
      const first = ingredients.get(thing).at(0);
      const second = ingredients.get(thing).at(1);
      callback({ item: thing, first, second });
      lookup_ingredients(first, callback, already_listed);
      lookup_ingredients(second, callback, already_listed);
    }
  }

  console.info(`recipe count = ${recipes.size}, item count = ${ingredients.size}`);

  return { lookup_ingredients, items: things };
}
