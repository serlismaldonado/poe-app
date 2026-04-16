import { EditorState } from "../state";

export interface IRenderer {
  render(state: EditorState): void;
  setSize(width: number, height: number): void;
  clear(): void;
}

export type StyleToken = {
  text: string;
  style: string;
};
