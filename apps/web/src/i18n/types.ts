/** Parámetros de un mensaje con variables (por ejemplo, el número de una ranura). */
export type MsgParams = Record<string, string | number>;
/** Un mensaje de error o de validación: texto fijo o función de sus parámetros. */
export type Msg = string | ((p: MsgParams) => string);
