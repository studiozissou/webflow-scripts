/* Minimal stubs for the Webflow packages, so the generated component can be typechecked
 * locally before pasting. Webflow provides the real modules at runtime; these exist only
 * to stop tsc failing on unresolved imports and hiding the errors that actually matter.
 *
 * Deliberately loose. The point of the local typecheck is to catch mistakes in OUR code
 * (bad inference in the inlined modules, wrong arity, unknown arithmetic), not to
 * re-specify Webflow's API — a wrong guess here would be worse than no types at all.
 *
 * Used by: npm run typecheck:nem
 */

declare module "@webflow/react" {
  export function declareComponent(component: unknown, config: unknown): unknown;
  export function useWebflowContext(): { interactive: boolean };
}

declare module "@webflow/data-types" {
  export const props: {
    Text(config: { name: string; defaultValue?: string }): string;
  };
}
