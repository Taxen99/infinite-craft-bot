import create_analyser from './analyse_lib.js';

const contents = await (await fetch('./combinations_combined.log')).text();
const { lookup_ingredients, items } = create_analyser(contents);
const input_elm = document.querySelector('input');
const container_elm = document.getElementById('container');
const recipe_elm = document.getElementById('recipe');
input_elm.addEventListener('input', _e => {
  const search_term = input_elm.value;
  const matches = [...items].filter(x => x.toLowerCase().includes(search_term.toLowerCase()));
  container_elm.textContent = '';
  recipe_elm.textContent = '';
  for(const match of matches) {
    const p_elm = document.createElement('p');
    p_elm.textContent = match;
    container_elm.appendChild(p_elm);
    p_elm.onclick = () => {
      recipe_elm.textContent = '';
      lookup_ingredients(match, ({ item, first, second }) => {
        recipe_elm.innerHTML += `${item} = ${first} + ${second}<br/>`;
      })
    }
  }
})
