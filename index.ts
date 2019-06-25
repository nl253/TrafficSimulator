import { EventEmitter } from 'events';
import fetch from 'node-fetch';

export interface DictStr<V> {
  [idx: string]: V;
}

export interface Graph {
  [idx: string]: DictStr<number>;
}

export const MILLISEC = 1;
export const SECOND   = 1000 * MILLISEC;
export const EXAMPLE_GRAPH: Graph = {
  'https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep': {
    'https://www.google.co.uk/search?newwindow=1&source=hp&ei=cVDHXPOtF5HosAfKnJrgDw&q=javascript+sleep+await&oq=jav&gs_l=psy-ab.1.0.35i39l2j0i20i263j0j0i131j0j0i20i263j0i131j0j0i131.889.1455..2407...0.0..0.131.347.3j1......0....1..gws-wiz.....0.8oIEbZdX7Es': 0.2,
    '%exit%': 0.8,
  },
  'https://news.ycombinator.com/': {
    'https://news.ycombinator.com/news?p=2': 0.2,
    '%exit%': 0.8,
  },
  'https://news.ycombinator.com/news?p=2': {
    'https://news.ycombinator.com/news?p=3': 0.1,
    '%exit%': 0.9,
  },
  'https://www.google.co.uk/search?newwindow=1&source=hp&ei=cVDHXPOtF5HosAfKnJrgDw&q=javascript+sleep+await&oq=jav&gs_l=psy-ab.1.0.35i39l2j0i20i263j0j0i131j0j0i20i263j0i131j0j0i131.889.1455..2407...0.0..0.131.347.3j1......0....1..gws-wiz.....0.8oIEbZdX7Es': {
    'https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep': 0.8,
    'https://flaviocopes.com/javascript-sleep/': 0.2,
  },
  'https://github.com/': {
    'https://github.com/': 0.4,
    'https://github.com/search?utf8=%E2%9C%93&q=node&type=': 0.5,
    '%exit%': 0.1,
  },
  'https://www.w3schools.com/jsref/met_win_settimeout.asp': {
    'https://www.w3schools.com/jsref/prop_win_opener.asp': 0.1,
    'https://www.w3schools.com/jsref/prop_win_sessionstorage.asp': 0.2,
    '%exit%': 0.7,
  },
  'https://github.com/search?utf8=%E2%9C%93&q=node&type=': {
    'https://github.com/nodejs/node': 0.6,
    '%exit%': 0.4,
  },
};

export type UserOpts = {
  nClients?:    number,
  delayRate?:   number,
  minTmOnPage?: number,
  maxTmOnPage?: number,
  maxDepth?:    number,
  minDepth?:    number,
  doLog?:       boolean,
  ps?: Array<number> | Float64Array | Float32Array,
};

export interface Printable {
  toString(): string;
}

export class TrafficSimulator extends EventEmitter {
  public readonly urls:      Array<string>;
  public readonly graph:     Graph;
  public readonly ps:        Float64Array;

  public readonly nClients:    number  =           10;
  public readonly delayRate:   number  =   1 * SECOND;
  public readonly minTmOnPage: number  =   3 * SECOND;
  public readonly maxTmOnPage: number  = 120 * SECOND;
  public readonly maxDepth:    number  =           20;
  public readonly minDepth:    number  =            2;
  public readonly doLog:       boolean =         true;

  public constructor(graph: Graph = EXAMPLE_GRAPH as Graph, opts: UserOpts = {}) {
    super();
    Object.assign(this, opts);
    this.urls  = Object.keys(graph);
    this.graph = graph;
    this.ps    = new Float64Array(new ArrayBuffer(8 * this.urls.length));

    // default to uniform probability for urls
    if (opts.ps === undefined) {
      for (let i = 0; i < this.ps.length; i++) {
        this.ps[i] = 1 / this.urls.length;
      }
    } else {
      for (let i = 0; i < this.ps.length; i++) {
        this.ps[i] = opts.ps[i];
      }
    }
    if (this.doLog) {
      const fmtDate: (date: Date) => string = date => date.constructor.name === 'Date' ? `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}` : fmtDate(new Date(date));
      this.warn('registering logging');
      // this.on('randURL', url => console.log(`selected random URL ${url}`));
      this.on('depth', name => this.log(`${name} done`));
      this.on('exit', name => this.log(`${name} done`));
      this.on('null', name => this.log(`${name} done`));
      this.on('req', (name, url, startTm, endTm, tookTm) => this.log(`${name} ${fmtDate(startTm)} GET ${url} (took ${tookTm}ms)`));
      this.on('spent', (name, url, spentTm) => this.log(`${name} spent ${Math.round(spentTm / SECOND)}sec on ${url}`));
      this.on('spawn', (cfg, date) => this.log(`${cfg.name} spawned at ${fmtDate(date)}`));
    }
  }

  // noinspection JSMethodCanBeStatic
  protected log(msg: Printable): void { return console.log(msg); }

  // noinspection JSMethodCanBeStatic
  protected warn(msg: Printable): void { return console.warn(msg); }

  // noinspection JSMethodCanBeStatic
  protected nameFunct(idx: number): string { return `client #${idx}`; }

  protected async clientWorker({ url, depth, name }: { url: string | null, depth: number, name: string }): Promise<void> {
    if (depth <= 0) {
      this.emit('depth', name);
      return;
    } else if (url === '%exit%') {
      this.emit('exit', name);
      return;
    } else if (url === null) {
      this.emit('null', name);
      return;
    }
    try {
      const startTm = Date.now();
      await fetch(<string>url);
      const endTm = Date.now();
      this.emit('req', name, url, startTm, endTm, endTm - startTm);
    } catch (e) {
      console.error(e.message);
    }

    const spentTm = this.randTmOnPg;

    // spend some time on the page
    await ((ms => new Promise(res => setTimeout(res, ms)))(spentTm));

    this.emit('spent', name, url, spentTm);

    return this.clientWorker({
      name,
      depth: depth - 1,
      url: this.sample(<string>url),
    });
  }

  protected sample(s: string): string | null {
    if (this.graph[s] === undefined) {
      return null;
    }
    const neighs: Array<[string, number]>
              = Object.entries(<DictStr<number>>this.graph[s])
                      .sort((n1: [string, number], n2: [string, number]) => (n1[1] > n2[1] ? -1 : 1));
    const cumSums = new Float64Array(new ArrayBuffer(neighs.length * 8));
    for (let i = 0; i < cumSums.length; i++) {
      let total = 0;
      for (let j = 0; j <= i; j++) {
        total += neighs[j][1];
      }
      cumSums[i] = total;
    }
    const r = Math.random();
    for (let i = 1; i < cumSums.length; i++) {
      if (r >= cumSums[i - 1] && r < cumSums[i]) {
        return neighs[i - 1][0];
      }
    }
    return null;
  }

  protected get randURL(): string {
    const url = this.urls[Math.floor(Math.random() * this.urls.length)];
    this.emit('randURL', url);
    return url;
  }

  protected get randDepth(): number { return TrafficSimulator.randUniform(this.minDepth, this.maxDepth); }

  protected get randTmOnPg(): number { return TrafficSimulator.randUniform(this.minTmOnPage, this.maxTmOnPage); }

  private static randUniform(min: number, max: number): number { return min + Math.random() * (max - min); }

  public simulate(): void {
    let t = 0;
    for (let i = 0; i < this.nClients; i++) {
      t += -Math.log(Math.random()) * this.delayRate;
      setTimeout(() => {
        const cfg = {
          depth: this.randDepth,
          name: this.nameFunct(i),
          url: this.randURL,
        };
        this.emit('spawn', cfg, new Date());
        // noinspection JSIgnoredPromiseFromCall
        this.clientWorker(cfg);
      }, t);
    }
  }
}
