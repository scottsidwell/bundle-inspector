import React from 'react';
import ReactDOM from 'react-dom';
import bytes from 'bytes';

const compare = (a, b) => a < b ? -1 : a === b ? 0 : 1;

const COLOR_MAP = [
  '#ff0029', '#377eb8', '#66a61e', '#984ea3', '#00d2d5', '#ff7f00', '#af8d00',
  '#7f80cd', '#b3e900', '#c42e60', '#a65628', '#f781bf', '#8dd3c7', '#bebada',
  '#fb8072', '#80b1d3', '#fdb462', '#fccde5', '#bc80bd', '#ffed6f', '#c4eaff',
  '#cf8c00', '#1b9e77', '#d95f02', '#e7298a', '#e6ab02', '#a6761d', '#0097ff',
  '#00d067', '#000000', '#252525', '#525252', '#737373', '#969696', '#bdbdbd',
  '#f43600', '#4ba93b', '#5779bb', '#927acc', '#97ee3f', '#bf3947', '#9f5b00',
  '#f48758', '#8caed6', '#f2b94f', '#eff26e', '#e43872', '#d9b100', '#9d7a00',
  '#698cff', '#d9d9d9', '#00d27e', '#d06800', '#009f82', '#c49200', '#cbe8ff',
  '#fecddf', '#c27eb6', '#8cd2ce', '#c4b8d9', '#f883b0', '#a49100', '#f48800',
  '#27d0df', '#a04a9b'
];
const getColor = (scriptName) => COLOR_MAP[bundleScriptSizes.findIndex(i => i.scriptName === scriptName)];

const sum = (arr) => arr.reduce((a, b) => a + b, 0)
const SourceSummary = () => {
  const totalScriptSize = sum(bundleScriptSizes.map(i => i.totalSize))
  return (
    <article>
      <h1>JS Source</h1>
      <section>
        <div className="ratio-bar">
          { bundleScriptSizes.map(script => (
            <div title={script.scriptName} style={{ width: (script.totalSize / totalScriptSize * 100) + '%', backgroundColor: getColor(script.scriptName) }} />
          ))}
        </div>
        <div style={{ marginTop: 'var(--base-unit)' }}/>
        { bundleScriptSizes.map(({ scriptName, totalSize}) => (
          <div class="row">
            <div class="square" style={{ backgroundColor: getColor(scriptName) }} title={scriptName}></div>
            <div class="grow">
              <span title={scriptName}>
                {(() => {
                  const url = new URL(scriptName);
                  return `${url.hostname}/.../${url.pathname.substring(url.pathname.lastIndexOf("/") + 1)}`
                })()}
              </span>
            </div>
            <div class="fixed" style={{ textAlign: 'right' }}>{ bytes(totalSize) }</div>
          </div>
        ))}
      </section>
    </article>
  )
}

class DuplicatePackages extends React.Component {
  constructor(props) {
    super(props);
    this.state = { shouldMergePackages: false };
    this.onToggle = () => this.setState({ shouldMergePackages: !this.state.shouldMergePackages });
  }
  render() {
    const { shouldMergePackages } = this.state;
    let transformed = packageDuplicates
      .filter(i => i.requiredFrom.length > 1);
    if (this.state.shouldMergePackages) {
      transformed = transformed
        .sort((a, b) => a.packageName.localeCompare(b.packageName))
        .reduce((array, next) => {
          const row = array.length && array[array.length - 1];
          if (row && row.packageName === next.packageName) {
            row.totalSize += next.totalSize;
            row.requiredFrom = [...row.requiredFrom, ...next.requiredFrom];
          } else {
            array.push({
              scriptName: '',
              packageName: next.packageName,
              requiredFrom: [...next.requiredFrom],
              totalSize: next.totalSize
            });
          }
          return array;
        }, []);
    }
    transformed = transformed.sort((a, b) => compare(b.totalSize, a.totalSize));
    return (
      <article>
        <h1>Duplicate Packages</h1>
        <h2>
          <span>GROUP PACKAGES ACROSS SCRIPTS: </span>
          <input type="checkbox" checked={shouldMergePackages} onChange={this.onToggle} />
        </h2>
        <section>
          { transformed.map(({ scriptName, packageName, requiredFrom, totalSize }) => (
            <div className="row">
              <div className="square small" style={{ backgroundColor: getColor(scriptName) }} title={scriptName}></div>
              <div className="fixed">{ bytes(totalSize) }</div>
              <div className="grow">
                <div>{ packageName }</div>
                { requiredFrom.map(path => <div className="dependency">{path}</div>) }
              </div>
            </div>
          ))}
        </section>
      </article>
    )
  }
};

class UnusedPackages extends React.Component {
  constructor(props) {
    super(props);
    this.state = { percentage: 95 }
    this.handleChange = (e) => this.setState({ percentage: Number.parseFloat(e.target.value) })
  }
  render() {
    const transformed = unusedPackages
      .map(i => ({ ...i, percentage: i.totalUnused * 100 / i.totalSize }))
      .filter(i => i.percentage >= this.state.percentage)
      .sort((a, b) => compare(Math.round(b.percentage), Math.round(a.percentage)) || compare(b.totalSize, a.totalSize));
    return (
      <article>
        <h1>Unused Packages</h1>
        <h2>
          <span>FILTER PACKAGE THAT ARE UNUSED BY AT LEAST: </span>
          <span class="lozenge">
            <input type="number" step="0.1" max="99.9" min="0" value={this.state.percentage} onChange={this.handleChange}/>
          </span>
        </h2>
        <section>
          { transformed.map(({ scriptName, percentage, totalUnused, packageName }) => (
            <div class="row">
              <div class="square small" style={{ backgroundColor: getColor(scriptName) }} title={scriptName}></div>
              <div class="fixed">{ Math.round(percentage) } %</div>
              <div class="fixed">{ bytes(totalUnused) }</div>
              <div class="grow">{ packageName }</div>
            </div>
          ))}
        </section>
      </article>
    );
  }
}

class UnusedApplicationCode extends React.Component {
  constructor(props) {
    super(props);
    this.state = { percentage: 95 }
    this.handleChange = (e) => this.setState({ percentage: Number.parseFloat(e.target.value) })
  }
  render() {
    const transformed = unusedApplicationCode
      .map(i => ({ ...i, percentage: i.totalUnused * 100 / i.totalSize }))
      .filter(i => i.percentage >= this.state.percentage)
      .filter(i => i.codePath.indexOf('node_modules') === -1)
      .sort((a, b) => compare(Math.round(b.percentage), Math.round(a.percentage)) || compare(b.totalSize, a.totalSize));
    return (
      <article>
        <h1>Unused Application Code</h1>
        <h2>
          <span>FILTER SOURCES THAT ARE UNUSED BY AT LEAST: </span>
          <span class="lozenge">
            <input type="number" step="0.1" max="99.9" min="0" value={this.state.percentage} onChange={this.handleChange}/>
          </span>
        </h2>
        <section>
          { transformed.map(({ scriptName, totalUnused, percentage, codePath }) => (
            <div class="row">
              <div class="square small" style={{ backgroundColor: getColor(scriptName) }} title={scriptName}></div>
              <div class="fixed">{ Math.round(percentage) } %</div>
              <div class="fixed">{ bytes(totalUnused) }</div>
              <div class="grow">{ codePath }</div>
            </div>
          )) }
        </section>
      </article>
    );
  }
}

const App = () => (
  <React.Fragment>
    <SourceSummary />
    <DuplicatePackages />
    <UnusedPackages />
    <UnusedApplicationCode />
  </React.Fragment>
)

if (window.INJECTED_STATISTICS) {
  const { bundleScriptSizes, packageDuplicates, unusedPackages, unusedApplicationCode } = window.INJECTED_STATISTICS;
  ReactDOM.render(<App />, document.getElementById('app'));
} else {
  ReactDOM.render(<span>No data found :(</span>, document.getElementById('app'));
}