export interface SearchMatch {
  line: number;
  col: number;
  length: number;
}

export class SearchEngine {
  private query: string = "";
  private matches: SearchMatch[] = [];
  private currentIdx: number = 0;

  search(lines: string[], query: string): SearchMatch[] {
    this.query = query;
    this.matches = [];
    this.currentIdx = 0;

    if (!query) return [];

    const lowerQuery = query.toLowerCase();

    for (let line = 0; line < lines.length; line++) {
      const lowerLine = lines[line].toLowerCase();
      let col = 0;

      while ((col = lowerLine.indexOf(lowerQuery, col)) !== -1) {
        this.matches.push({
          line,
          col,
          length: query.length,
        });
        col += 1;
      }
    }

    return this.matches;
  }

  getMatches(): SearchMatch[] {
    return this.matches;
  }

  getCurrentMatch(): SearchMatch | null {
    if (this.currentIdx < 0 || this.currentIdx >= this.matches.length) {
      return null;
    }
    return this.matches[this.currentIdx];
  }

  nextMatch(): SearchMatch | null {
    if (this.matches.length === 0) return null;
    this.currentIdx = (this.currentIdx + 1) % this.matches.length;
    return this.getCurrentMatch();
  }

  prevMatch(): SearchMatch | null {
    if (this.matches.length === 0) return null;
    this.currentIdx =
      (this.currentIdx - 1 + this.matches.length) % this.matches.length;
    return this.getCurrentMatch();
  }

  goToMatch(index: number): SearchMatch | null {
    if (index < 0 || index >= this.matches.length) return null;
    this.currentIdx = index;
    return this.getCurrentMatch();
  }

  replace(lines: string[], replacement: string): { lines: string[]; count: number } {
    if (this.matches.length === 0) {
      return { lines, count: 0 };
    }

    const newLines = lines.slice();
    let count = 0;
    let offset = 0;

    for (const match of this.matches) {
      const line = newLines[match.line];
      const newLine =
        line.slice(0, match.col + offset) +
        replacement +
        line.slice(match.col + offset + match.length);

      newLines[match.line] = newLine;
      offset += replacement.length - match.length;
      count++;
    }

    return { lines: newLines, count };
  }

  replaceOne(
    lines: string[],
    replacement: string,
    matchIdx: number
  ): { lines: string[]; offset: number } {
    if (matchIdx < 0 || matchIdx >= this.matches.length) {
      return { lines, offset: 0 };
    }

    const match = this.matches[matchIdx];
    const line = lines[match.line];
    const newLine =
      line.slice(0, match.col) +
      replacement +
      line.slice(match.col + match.length);

    const newLines = lines.slice();
    newLines[match.line] = newLine;
    const offset = replacement.length - match.length;

    return { lines: newLines, offset };
  }
}
