/**
 * Pausa a execução por `ms`. Injetado como dependência no client da OpenStates
 * para que os testes verifiquem o throttle sem esperar tempo real.
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
