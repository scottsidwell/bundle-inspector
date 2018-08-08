#!/usr/bin/env node
import parseArgs from 'minimist'
import { measureJavascriptUsageOn } from './inspect-bundle';

const argv = parseArgs(process.argv.slice(2));
const [ url ] = argv['_'];
const loginUrl = argv['login-url'];
const help = 'h' in argv || 'help' in argv;

if (!help && url) {
  measureJavascriptUsageOn(url, loginUrl);
} else {
  outputHelp();
}

function outputHelp() {
  console.error(`
    Usage: inspect-bundle <url> [options]

    Options:
        --login-url    <login-url>   URL to visit before starting page measurement
        -h, --help                   Output usage information
  `)
}