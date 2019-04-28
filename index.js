const fetch = require('node-fetch');

const EXAMPLE_GRAPH = {
  'https://github.com/': {
    'https://github.com/': 0.8,
    'https://github.com/search?utf8=%E2%9C%93&q=node&type=': 0.2,
  },
  'https://www.w3schools.com/jsref/met_win_settimeout.asp': {
    'https://www.w3schools.com/jsref/prop_win_opener.asp': 0.5,
    'https://www.w3schools.com/jsref/prop_win_sessionstorage.asp': 0.2,
    '%exit%': 0.3,
  },
  'https://github.com/search?utf8=%E2%9C%93&q=node&type=': {
    'https://github.com/nodejs/node': 0.8,
    '%exit%': 0.2,
  },
};

class TrafficSimulator {
  /**
   * @param {Object<string,Object<string,!number>>} graph
   * @param {?Float64Array} [ps]
   */
  constructor(graph = EXAMPLE_GRAPH, ps = null) {
    if (ps === null) {
      const n = Object.keys(graph).length;
      this.ps = new Float64Array(new ArrayBuffer(8 * n)).map(() => 1 / n);
    } else {
      this.ps = new Float64Array(new ArrayBuffer(8 * n)).map((_, idx) => ps[idx]);
    }
    this.urls = Object.keys(graph);
    this.graph = graph;
  }

  /**
   * @returns {!string} random URL
   */
  get randSite() {
    return this.urls[Math.floor(Math.random() * this.urls.length)];
  }

  /**
   * @param {{s0: !string, depth: !number, name: !string}} cfg
   */
  async client({ s0, depth, name }) {
    if (depth <= 0) {
      console.log(`${name} finished`);
      return;
    } else if (s0 === '%exit%') {
      console.log(`${name} reached exit`);
      return;
    } else if (s0 === null) {
      console.log(`${name} reached null`);
      return;
    }
    try {
      console.log(`${name} requesting from "${s0}"`);
      const startTm = Date.now();
      await fetch(s0);
      console.log(`${name} received from "${s0}" (took ${Date.now() - startTm}ms)`);
    } catch (e) {
      console.log(e.message);
    }
    return this.client({
      name,
      depth: depth - 1,
      s0: this.sample(s0),
    });
  }

  /**
   * @param {?string} s URL (state)
   * @returns {?string} URL
   */
  sample(s) {
    if (this.graph[s] === undefined) {
      return null;
    }
    const neighs = Object
      .entries(this.graph[s])
      .sort((n1, n2) => (n1[1] > n2[1] ? -1 : 1));
    const cumsums = new Float64Array(new ArrayBuffer(neighs.length * 8));
    for (let i = 0; i < cumsums.length; i++) {
      let total = 0;
      for (let j = 0; j <= i; j++) {
        total += neighs[j][1];
      }
      cumsums[i] = total;
    }
    const r = Math.random();
    for (let i = 1; i < cumsums.length; i++) {
      if (r >= cumsums[i - 1] && r < cumsums[i]) {
        return neighs[i - 1][0];
      }
    }
    return null;
  }

  /**
   * @param {!Number} [nClients]
   * @param {!Number} [rate]
   * @param {!Number} [minDepth]
   * @param {!Number} [maxDepth]
   */
  simulate(nClients = 50, rate = 100, minDepth = 2, maxDepth = 10) {
    let t = 0;
    for (let i = 0; i < nClients; i++) {
      t += -Math.log(Math.random()) * rate;
      setTimeout(() => {
        const name = `client #${i}`;
        const d = new Date();
        console.log(`${name} spawned at ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}:${d.getMilliseconds()}`);
        this.client({
          depth: minDepth + Math.floor(Math.random() * (maxDepth - minDepth)),
          name,
          s0: this.randSite,
        });
      }, t);
    }
  }
}

module.exports = TrafficSimulator;
