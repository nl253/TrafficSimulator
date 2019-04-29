# Traffic Simulator 

```js
const TrafficSimulator = require('traffic-simulator');

// adjacancy list (floats are PROBABILITIES, they MUST add up to 1.0)
const EXAMPLE_GRAPH = {
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

const MILLISEC = 1;
const SECOND = 1000 * MILLISEC;

// defaults
const opts = {
  delayRate: 1 * SECOND,
  nameFunct: idx => `client #${idx}`,
  minDepth: 2,
  maxDepth: 20,
  minTmOnPage: 1 * SECOND,
  doLog: true,
  maxTmOnPage: 30 * SECOND,
  nClients: 50,
};

const ts = new TrafficSimulator(graph, opts);

ts.simulate();
```
