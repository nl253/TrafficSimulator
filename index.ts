import { EventEmitter } from 'events';
import * as fetch from 'node-fetch';

interface DictStr<V> {
  [idx: string]: V;
}

interface Graph {
  [idx: string]: DictStr<number>;
}

const MILLISEC = 1;
const SECOND = 1000 * MILLISEC;
const EXAMPLE_GRAPH: Graph = {
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

type UserOpts = {
  ps?: Array<number> | Float64Array | Float32Array,
  delayRate?: number,
  minTmOnPage?: number,
  maxTmOnPage?: number,
  maxDepth?: number,
  minDepth?: number,
  rate?: number,
  unit?: number,
  nameFunct?: (idx: number) => string,
  log?: (s: string) => void,
  warn?: (s: string) => void,
};

class TrafficSimulator extends EventEmitter {
  public readonly urls: Array<string>;
  public readonly graph: object;
  public readonly ps: Float64Array;
  public readonly delayRate: number;

  public readonly minTmOnPage: number =   3 * SECOND;
  public readonly maxTmOnPage: number = 120 * SECOND;
  public readonly maxDepth: number    =           20;
  public readonly minDepth: number    =            2;
  public readonly rate: number        =            3;
  public readonly unit: number        =       SECOND;
  public readonly doLog: boolean      =         true; 

  public readonly nameFunct: (idx: number) => string = idx => `client #${idx}`;
  public readonly log: (s: string) => void           = console.log;
  public readonly warn: (s: string) => void          = console.warn;

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
    if (this.doLog === true) {
      const fmtDate = date => date.constructor.name === 'Date' ? `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}` : fmtDate(new Date(date));
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

  private get randURL(): string {
    const url = this.urls[Math.floor(Math.random() * this.urls.length)];
    this.emit('randURL', url);
    return url;
  }

  private async client({ url, depth, name }: { url: string, depth: number, name: string }): void {
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
      await fetch(url);
      const endTm = Date.now();
      this.emit('req', name, url, startTm, endTm, endTm - startTm);
    } catch (e) {
      console.error(e.message);
    }

    const spentTm = this.minTmOnPage + Math.random() * (this.maxTmOnPage - this.minTmOnPage);

    // spend some time on the page
    await ((ms => new Promise(res => setTimeout(res, ms)))(spentTm));

    this.emit('spent', name, url, spentTm);

    return this.client({
      name,
      depth: depth - 1,
      url: this.sample(url),
    });
  }

  private sample(s: string): string {
    if (this.graph[s] === undefined) {
      return null;
    }
    const neighs = Object.entries(this.graph[s])
                         .sort((n1, n2) => (n1[1] > n2[1] ? -1 : 1));
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

  public simulate(): void {
    let t = 0;
    for (let i = 0; i < this.nClients; i++) {
      t += -Math.log(Math.random()) * this.delayRate;
      setTimeout(() => {
        const cfg = {
          depth: this.minDepth + Math.floor(Math.random() * (this.maxDepth - this.minDepth)),
          name: this.nameFunct(i),
          url: this.randURL,
        };
        this.emit('spawn', cfg, new Date());
        this.client(cfg);
      }, t);
    }
  }
}

module.exports = TrafficSimulator;
