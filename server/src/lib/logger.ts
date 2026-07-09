/**
 * Logger mínimo, injetado em client e services. Existir como interface é o que
 * permite aos testes afirmarem *o que* foi logado (ex.: o aviso único de
 * `per_page`) sem espionar o console global.
 */
export interface Logger {
  info(mensagem: string): void;
  warn(mensagem: string): void;
  error(mensagem: string, erro?: unknown): void;
}

/**
 * Os métodos delegam dentro do corpo, em vez de `info: console.info`: assim a
 * referência é resolvida na chamada, e um `vi.spyOn(console, ...)` funciona.
 */
export const consoleLogger: Logger = {
  info: (mensagem) => {
    console.info(mensagem);
  },
  warn: (mensagem) => {
    console.warn(mensagem);
  },
  error: (mensagem, erro) => {
    // Sem o guard, um erro ausente imprimiria `undefined` solto na saída.
    if (erro === undefined) console.error(mensagem);
    else console.error(mensagem, erro);
  },
};
