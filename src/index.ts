#!/usr/bin/env node
import parseArgs from 'minimist'
import { measureJavascriptUsageOn } from './inspect-bundle';

const argv = parseArgs(process.argv.slice(2));
const [ url ] = argv['_'];
const loginUrl = argv['u'] || argv['login-url'];
const selector = argv['s'] || argv['page-loaded-selector'];
const help = 'h' in argv || 'help' in argv;

if (!help && url) {
  measureJavascriptUsageOn(url, loginUrl, selector);
} else {
  outputHelp();
}

function outputHelp() {
  console.error(`
    Usage: inspect-bundle <url> [options]

    Options:
        -u, --login-url               <login-url>   URL to visit before starting page measurement
        -s, --page-loaded-selector    <selector>    Treat page as loaded when selector is present
        -h, --help                                  Output usage information
  `)
}