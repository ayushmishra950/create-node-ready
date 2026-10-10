// Tiny ANSI helpers. Colours switch off when the output is not a terminal or NO_COLOR is set.
const useColor = (): boolean => {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return Boolean(process.stdout.isTTY);
};

const paint = (open: number, close: number) => (text: string): string =>
  useColor() ? `\x1b[${open}m${text}\x1b[${close}m` : text;

export const bold = paint(1, 22);
export const dim = paint(2, 22);
export const red = paint(31, 39);
export const green = paint(32, 39);
export const yellow = paint(33, 39);
export const blue = paint(34, 39);
export const cyan = paint(36, 39);

export const log = (line = ''): void => void process.stdout.write(line + '\n');
export const warn = (line: string): void => void process.stderr.write(`${yellow('!')} ${line}\n`);
export const fail = (line: string): void => void process.stderr.write(`${red('✖')} ${line}\n`);
