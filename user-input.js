import { Interface, createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export const create_asker = () => createInterface({ input, output })
export const destroy_asker = (asker) => asker.close()
export const ask = (asker, question) => asker.question(question);
export const ask_once = async (question) => {
        const asker = create_asker();
        const ans = await ask(asker, question);
        destroy_asker(asker);
        return ans;
}
