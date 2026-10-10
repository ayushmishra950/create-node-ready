import { createInterface, emitKeypressEvents } from 'node:readline';
import { bold, cyan, dim } from './ui';

export const isInteractive = (): boolean => Boolean(process.stdin.isTTY && process.stdout.isTTY);

/** Asks for a line of text. An empty answer returns `fallback`. */
export function askText(question: string, fallback: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, reject) => {
    rl.on('close', () => reject(new Error('cancelled')));
    rl.question(`${bold(question)} ${dim(`(${fallback})`)} `, (answer) => {
      rl.removeAllListeners('close');
      rl.close();
      resolve(answer.trim() || fallback);
    });
  });
}

export interface Choice<V> {
  value: V;
  label: string;
  hint: string;
}

/** Arrow-key list (also j/k and the number keys). Enter confirms, Ctrl+C cancels. */
export function select<V>(question: string, choices: Choice<V>[], initial = 0): Promise<V> {
  const out = process.stdout;
  const stdin = process.stdin;
  let index = initial;
  let drawn = false;

  const render = (): void => {
    if (drawn) out.write(`\x1b[${choices.length + 1}A\x1b[0J`);
    drawn = true;
    out.write(`${bold(question)} ${dim('(use ↑ ↓ and Enter)')}\n`);
    choices.forEach((c, i) => {
      const line = `${c.label}  ${dim(c.hint)}`;
      out.write(i === index ? `${cyan('❯')} ${cyan(line)}\n` : `  ${line}\n`);
    });
  };

  return new Promise((resolve, reject) => {
    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    out.write('\x1b[?25l');
    render();

    const done = (result: () => void): void => {
      stdin.off('keypress', onKey);
      stdin.setRawMode(false);
      stdin.pause();
      out.write('\x1b[?25h');
      result();
    };

    const onKey = (_: string | undefined, key: { name?: string; ctrl?: boolean; sequence?: string }): void => {
      if (key.ctrl && (key.name === 'c' || key.name === 'd')) return done(() => reject(new Error('cancelled')));
      if (key.name === 'up' || key.name === 'k') index = (index + choices.length - 1) % choices.length;
      else if (key.name === 'down' || key.name === 'j') index = (index + 1) % choices.length;
      else if (key.sequence && /^[1-9]$/.test(key.sequence) && Number(key.sequence) <= choices.length) index = Number(key.sequence) - 1;
      else if (key.name === 'return' || key.name === 'enter') {
        const picked = choices[index] as Choice<V>;
        return done(() => {
          out.write(`\x1b[${choices.length + 1}A\x1b[0J${bold(question)} ${cyan(picked.label)}\n`);
          resolve(picked.value);
        });
      } else return;
      render();
    };
    stdin.on('keypress', onKey);
  });
}
