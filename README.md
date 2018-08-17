# bundle-inspector
---
> Analyze a live website's bundles to understand its dependency tree

## Installation

```sh
yarn global add bundle-inspector
```

or

```
npm install --global bundle-inspector
```

## Usage

From the command line run:

```
bundle-inspector https://google.com
```

This will run puppeteer to hit the chosen website, and analyze the javascript bundle. The results will be written to a html file in the directory from which you run the command with a format of:

```
<DATE>@<TARGET_SITE>
```

eg:

```
2018-08-17T03:56:33.156Z@https-google-com.html
```

## The information you get

### JS Source
A list of the js source files and the size of each

### Duplicate Packages
A list of packages that are downloaded in multiple scripts. Can be used to de-duplicate npm packages

### Unused Packages

### Unused Application Code
