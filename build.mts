const EMPTY_UI8A = new Uint8Array();

class U8StreamReader {
  done = false;
  i = 0;
  length = 0;
  value: Uint8Array = EMPTY_UI8A;
  constructor(public reader: ReadableStreamDefaultReader<Uint8Array>) {}
  async next(this: U8StreamReader) {
    const { done, value = EMPTY_UI8A } = await this.reader.read();
    if (this.done === done && this.value === value) {
      return { changed: false };
    }
    this.done = done;
    this.i = 0;
    this.length = value.length;
    this.value = value;
    return { changed: true };
  }
  releaseLock() {
    this.reader.releaseLock();
  }
}

async function U8StreamCompare(stream1: ReadableStream<Uint8Array>, stream2: ReadableStream<Uint8Array>) {
  const one = new U8StreamReader(stream1.getReader());
  const two = new U8StreamReader(stream2.getReader());
  try {
    while (true) {
      let changed = false;
      if (one.done === false && one.i >= one.length) {
        if ((await one.next()).changed === true) {
          changed = true;
        }
      }
      if (two.done === false && two.i >= two.length) {
        if ((await two.next()).changed === true) {
          changed = true;
        }
      }
      if (one.done && two.done) {
        return true;
      }
      if (one.done !== two.done || changed === false) {
        return false;
      }
      while (one.i < one.length && two.i < two.length) {
        if (one.value[one.i] !== two.value[two.i]) {
          return false;
        }
        one.i++;
        two.i++;
      }
    }
  } finally {
    one.releaseLock();
    two.releaseLock();
  }
}

export function CompareFiles(a: BunFile, b: BunFile) {
  return U8StreamCompare(a.stream(), b.stream());
}

async function CopyFile({ from, to, verify = true }: { from: string; to: string; verify?: boolean }) {
  if (from === to) {
    return false;
  }
  const fromFile = Bun.file(from);
  const toFile = Bun.file(to);
  await Bun.write(toFile, fromFile);
  if (verify === true) {
    return CompareFiles(fromFile, toFile);
  }
  return true;
}

// source files
await CopyFile({ from: './out/src/appInsightsClient.js', to: './build/appInsightsClient.js' });
await CopyFile({ from: './out/src/codeManager.js',       to: './build/codeManager.js' });
await CopyFile({ from: './out/src/constants.js',         to: './build/constants.js' });
await CopyFile({ from: './out/src/extension.js',         to: './build/extension.js' });
await CopyFile({ from: './out/src/utility.js',           to: './build/utility.js' });

// supplementary files
await CopyFile({ from: 'LICENSE',      to: './build/LICENSE' });
await CopyFile({ from: 'BACKERS.md',   to: './build/BACKERS.md' });
await CopyFile({ from: 'CHANGELOG.md', to: './build/CHANGELOG.md' });
await CopyFile({ from: 'README.md',    to: './build/README.md' });
