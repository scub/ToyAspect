# ToyAspect

This a toy implementation to demonstrate how to use and debug AWS CDK aspect libraries getting applied to CDK scopes.

## Key take aways

- Because aspects operate on the rendered cloudformation you will always be dealing with the L1 Cfn-version of those constructs.
    - Remember to use these interfaces when making modifications
- You should take care to keep aspects account/environment agnostic

## Overall Project structure

```bash
.
├── .assets - This holds README assets
├── .vscode - This holds a launch configuration that lets us debug the aspect  
├── bin     - This holds a demo-stack that is used as part of the debug harness  
├── lib     - This holds our aspect
└── test    - This holds a couple test scenarios that validate the aspect does what we expect 
```

## Getting started

```bash
# Install dependencies
npm install
# Run unit tests 
npm test
# Synth the demo stack and apply the aspect 
npx cdk synth
```

## Tools Used

- [asdf](https://asdf-vm.com/guide/getting-started.html) - Version manager for all languages (see: ./.tool-versions)