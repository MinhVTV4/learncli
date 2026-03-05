import { VFS } from '../vfs/VFS';

export class Nano {
  private vfs: VFS;
  private filePath: string | null = null;
  private content: string[] = [""];
  private cursor = { x: 0, y: 0 };
  private scrollY = 0;
  private rows = 20;
  private cols = 80;
  private isModified = false;
  private message = "";
  private mode: 'edit' | 'save_confirm' | 'exit_confirm' = 'edit';

  constructor(vfs: VFS, rows: number = 20, cols: number = 80) {
    this.vfs = vfs;
    this.rows = rows;
    this.cols = cols;
  }

  async open(path: string) {
    this.filePath = path;
    if (await this.vfs.exists(path)) {
      const text = await this.vfs.read(path);
      this.content = text.split('\n');
      if (this.content.length === 0) this.content = [""];
    } else {
      this.content = [""];
      this.message = "New File";
    }
    this.cursor = { x: 0, y: 0 };
    this.scrollY = 0;
    this.isModified = false;
    this.mode = 'edit';
  }

  handleInput(key: string, ctrlKey: boolean): { output: string, exit: boolean } {
    this.message = ""; // Clear message on input

    if (this.mode === 'save_confirm') {
      if (key === 'y' || key === 'Y') {
        // Save
        this.save();
        this.mode = 'edit';
        return { output: this.render(), exit: false };
      } else if (key === 'n' || key === 'N' || (ctrlKey && key === 'c')) {
        this.mode = 'edit';
        this.message = "Cancelled";
        return { output: this.render(), exit: false };
      } else if (key === '\r') { // Enter to confirm filename (simplified)
         this.save();
         this.mode = 'edit';
         return { output: this.render(), exit: false };
      }
      return { output: this.render(), exit: false };
    }

    if (this.mode === 'exit_confirm') {
      if (key === 'y' || key === 'Y') {
        this.save();
        return { output: "", exit: true };
      } else if (key === 'n' || key === 'N') {
        return { output: "", exit: true };
      } else if (ctrlKey && key === 'c') {
        this.mode = 'edit';
        return { output: this.render(), exit: false };
      }
      return { output: this.render(), exit: false };
    }

    // Normal Edit Mode
    if (ctrlKey) {
      if (key === 'x') {
        if (this.isModified) {
          this.mode = 'exit_confirm';
          this.message = "Save modified buffer?  (Answering \"No\" will DESTROY changes) ";
        } else {
          return { output: "", exit: true };
        }
      } else if (key === 'o') {
        this.save();
        this.message = `Wrote ${this.content.length} lines`;
      }
      return { output: this.render(), exit: false };
    }

    // Navigation
    if (key === '\x1b[A') { // Up
      if (this.cursor.y > 0) this.cursor.y--;
    } else if (key === '\x1b[B') { // Down
      if (this.cursor.y < this.content.length - 1) this.cursor.y++;
    } else if (key === '\x1b[C') { // Right
      if (this.cursor.x < this.content[this.cursor.y].length) {
        this.cursor.x++;
      } else if (this.cursor.y < this.content.length - 1) {
        this.cursor.y++;
        this.cursor.x = 0;
      }
    } else if (key === '\x1b[D') { // Left
      if (this.cursor.x > 0) {
        this.cursor.x--;
      } else if (this.cursor.y > 0) {
        this.cursor.y--;
        this.cursor.x = this.content[this.cursor.y].length;
      }
    } else if (key === '\r') { // Enter
      const line = this.content[this.cursor.y];
      const left = line.slice(0, this.cursor.x);
      const right = line.slice(this.cursor.x);
      this.content[this.cursor.y] = left;
      this.content.splice(this.cursor.y + 1, 0, right);
      this.cursor.y++;
      this.cursor.x = 0;
      this.isModified = true;
    } else if (key === '\x7F') { // Backspace
      if (this.cursor.x > 0) {
        const line = this.content[this.cursor.y];
        this.content[this.cursor.y] = line.slice(0, this.cursor.x - 1) + line.slice(this.cursor.x);
        this.cursor.x--;
        this.isModified = true;
      } else if (this.cursor.y > 0) {
        const currLine = this.content[this.cursor.y];
        const prevLine = this.content[this.cursor.y - 1];
        this.cursor.x = prevLine.length;
        this.content[this.cursor.y - 1] = prevLine + currLine;
        this.content.splice(this.cursor.y, 1);
        this.cursor.y--;
        this.isModified = true;
      }
    } else if (key.length === 1 && key.charCodeAt(0) >= 32) { // Printable
      const line = this.content[this.cursor.y];
      this.content[this.cursor.y] = line.slice(0, this.cursor.x) + key + line.slice(this.cursor.x);
      this.cursor.x++;
      this.isModified = true;
    }

    // Adjust scroll
    if (this.cursor.y < this.scrollY) {
      this.scrollY = this.cursor.y;
    } else if (this.cursor.y >= this.scrollY + (this.rows - 2)) { // -2 for header/footer
      this.scrollY = this.cursor.y - (this.rows - 3);
    }

    return { output: this.render(), exit: false };
  }

  private async save() {
    if (this.filePath) {
      await this.vfs.write(this.filePath, this.content.join('\n'));
      this.isModified = false;
    }
  }

  render(): string {
    // ANSI Clear Screen
    let output = "\x1b[2J\x1b[H";

    // Header
    output += "\x1b[7m  GNU nano 2.9.8              File: " + (this.filePath || "New Buffer") + " ".repeat(Math.max(0, 40 - (this.filePath?.length || 10))) + (this.isModified ? "Modified  " : "          ") + "\x1b[0m\r\n";

    // Body
    const viewHeight = this.rows - 3; // Header + 2 Footer lines
    for (let i = 0; i < viewHeight; i++) {
      const lineIdx = this.scrollY + i;
      if (lineIdx < this.content.length) {
        output += this.content[lineIdx].slice(0, this.cols) + "\r\n";
      } else {
        output += "\r\n";
      }
    }

    // Footer
    output += `\x1b[7m${this.message.padEnd(this.cols, ' ')}\x1b[0m\r\n`;
    if (this.mode === 'edit') {
      output += "^G Get Help  ^O Write Out  ^W Where Is  ^K Cut Text  ^J Justify  ^C Cur Pos\r\n";
      output += "^X Exit      ^R Read File  ^\\ Replace   ^U Uncut Text^T To Spell ^_ Go To Line";
    } else if (this.mode === 'exit_confirm') {
       output += " Y Yes\r\n N No\t^C Cancel";
    }

    // Move Cursor
    const visualY = (this.cursor.y - this.scrollY) + 2; // +1 for header, +1 for 1-based ANSI
    const visualX = this.cursor.x + 1;
    output += `\x1b[${visualY};${visualX}H`;

    return output;
  }
}
