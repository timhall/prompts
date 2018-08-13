const color = require('kleur');
const Prompt = require('./prompt');
const { cursor } = require('sisteransi');
const { style, clear, strip } = require('../util');

/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.initial] Default value
 * @param {Function} [opts.validate] Validate function
 */
class TextPrompt extends Prompt {
  constructor(opts={}) {
    super(opts);
    this.transform = style.render(opts.style);
    this.scale = this.transform.scale;
    this.msg = opts.message;
    this.initial = opts.initial || ``;
    this.validator = value => value === `t` || value === `terkelg`; // TESTING
    this.value = ``;
    this.errorMsg = `Please Enter A Valid Value`;
    //this.valid = true;
    this.cursor = Number(!!this.initial);
    this.cursorY = 0;
    this.clear = clear(``);
    this.render();
  }

  set value(v) {
    if (!v && this.initial) {
      this.placeholder = true;
      this.rendered = color.gray(this.transform.render(this.initial));
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(v);
    }
    this._value = v;
    this.fire();
  }

  get value() {
    return this._value;
  }

  reset() {
    this.value = ``;
    this.cursor = Number(!!this.initial);
    // this.error = false;
    this.fire();
    this.render();
  }

  abort() {
    this.value = this.value || this.initial;
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.out.write('\n');
    this.close();
  }

  validate() {
    let valid = this.validator(this.value);
    if (typeof valid === `string`) {
      this.errorMsg = valid; // get line count?
      valid = false;
    }
    this.error = !valid;
  }

  submit() {
    this.value = this.value || this.initial;
    this.validate();
    if (this.error) {
      this.value = ``;
      this.cursor = 0;
      this.fire();
      this.render();
    } else {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.out.write('\n');
      this.close();
    }
  }

  next() {
    if (!this.placeholder) return this.bell();
    this.value = this.initial;
    this.cursor = this.rendered.length;
    this.fire();
    this.render();
  }

  moveCursor(n) {
    if (this.placeholder) return;
    this.cursor = this.cursor+n;
  }

  _(c, key) {
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor);
    this.moveCursor(1);
    this.value = `${s1}${c}${s2}`;
    this.error = false;
    if (this.placeholder) this.cursor = 0;
    this.render();
  }

  delete() {
    if (this.value.length === 0) return this.bell();
    let s1 = this.value.slice(0, this.cursor-1);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${s2}`;
    this.moveCursor(-1);
    this.render();
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    this.cursor = this.value.length;
    this.render();
  }

  left() {
    if (this.cursor <= 0 || this.placeholder) return this.bell();
    this.moveCursor(-1);
    this.render();
  }

  right() {
    if (this.cursor*this.scale >= this.rendered.length || this.placeholder) return this.bell();
    this.moveCursor(1);
    this.render();
  }

  render() {
    if (this.cursorY) {
      this.out.write(cursor.down(this.cursorY)); // more than one line error?
      this.cursorY = 0;
    }
    // split by line breaks. Count length of array

    let prompt = [
      style.symbol(this.done, this.aborted),
      color.bold(this.msg),
      style.delimiter(this.done),
      this.rendered
    ].join(` `);

    let length = strip(prompt).length;

    if (this.error) {
      prompt += `\n${this.errorMsg}`;
      this.cursorY = 1;
    }

    this.out.write(this.clear+prompt);

    // move back up
    if (this.cursorY) {
      this.out.write(cursor.up(this.cursorY));
      this.out.write(cursor.left+cursor.to(length));
    }

    this.out.write(cursor.move(this.placeholder ?
      -this.initial.length*this.scale :
      -this.rendered.length+this.cursor*this.scale
    ));

    this.clear = clear(prompt);
  }
}

module.exports = TextPrompt;
