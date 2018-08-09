import puppeteer from "puppeteer";
import ora from 'ora';
import { Browser } from "puppeteer";
import { parseCoverageWithSourcemaps } from "./coverage";
import { generateReport } from "./report";
import { fetchSourceMaps } from "./source-map";

async function progress<T>(text: string, work: () => PromiseLike<T>): Promise<T> {
  const spinner = ora(text).start();
  try {
    const result = await work();
    spinner.succeed();
    return result;
  } catch (e) {
    spinner.fail(e);
    throw e;
  }
}

async function login(browser: Browser, loginUrl: string) {
  const loginPage = await browser.newPage();
  await loginPage.goto(loginUrl);
  await loginPage.waitForNavigation({ waitUntil: "domcontentloaded" });
  await loginPage.close();
}

async function measurePage(browser: Browser, url: string, selector?: string) {
  const page = await browser.newPage();
  await page.coverage.startJSCoverage();
  await page.goto(url);
  if (selector) {
    await page.waitForSelector(selector);
  }
  const coverage =  await page.coverage.stopJSCoverage();
  page.close();
  return coverage;
}

export async function measureJavascriptUsageOn(url: string, loginUrl?: string, selector?: string) {
  const browser = await progress('Starting Puppeteer 🌏', () => puppeteer.launch());

  try {
    if (loginUrl) {
      await progress('Getting the magic account cookies 🍪', () => login(browser, loginUrl));
    }

    const coverage = await progress(
      'Calculating coverage of initial assets ⏱',
      () => measurePage(browser, url, selector)
    );

    const sourcemaps = await progress(
      'Fetching source-maps for scripts in coverage 🖥',
      () => fetchSourceMaps(coverage)
    )

    const metrics = await progress(
      'Mixing coverage and source-maps 🥘',
      () => parseCoverageWithSourcemaps(coverage, sourcemaps)
    );

    await progress(
      'Writing up the report 🤓',
      () => generateReport(url, metrics)
    );
  } catch (e) {
    console.log(e.stack);
  } finally {
    await progress('Stopping Puppeteer', () => browser.close());
  }
}

