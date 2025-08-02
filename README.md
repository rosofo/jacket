# ![The jacket logo: a 'J' with an integrated 'play' symbol](./assets/readme-icon.png) Jacket - WebGPU Execution Visualizer

![A screenshot of Jacket in-use. The page is divided into quadrants: at the top left there's the canvas showing a 3D cube rendered by the user, as well as a play/pause button. Bottom-left is the user's code and controls for loading it. Top-right shows a graph of WebGPU objects created during the setup and frame-by-frame execution of the code, explained in more detail below. On the bottom-right is a text console containing relevant logs.](./assets/screenshot.webp)

Jacket is a graph-based visualizer for the execution of WebGPU code.

It is a static, offline-capable web app which watches your local code folder, runs your WebGPU code and shows you in realtime what it's doing.

> Jacket makes use of newish (for mid-2025) Web APIs. As such it will only work on recent browsers such as Chrome stable and soon Firefox stable.

## What can it do?

- Show you WebGPU objects such as buffers, pipelines, encoders. Basically any of the classes named `GPUxxx` in Javascript
- Show object relationships, principally 'produced-by' such as `GPUDevice -> GPUCommandEncoder`, and 'used-by' e.g. `GPUBuffer -> GPUBindGroup`
- Give the class-specific status/details of objects like whether a `GPUBuffer` is mapped or unmapped
- Do it all in realtime
- Auto-reload your local code
- Be used entirely offline. It won't send your code anywhere and uses a service worker to cache itself after first load

## Start Visualizing

Visit the [hosted version](https://rosofo.github.io/jacket), click the 'path' button to load up a folder. The folder should minimally contain a `main.js` module which exports `program(params) {...}`. 

The `params` object contains:

- proxied versions of the `navigator` and `HTMLCanvasElement`
- a `files` record with name and text of any other files found in the folder. So for example if you have `main.js` and next to it a `fragment.wgsl`, your code would access that via `params.files['fragment.wgsl']`

In this function you can write your setup code, and then return a `Promise<() => void>` containing your per-frame code.

> If you prefer to use a bundler and external dependencies that's fine, you can point Jacket at your build folder and it should be happy!
>
> See `examples/` for one way to set that up.

## Run it locally

Just clone this repo and run `npm i` then `npm run dev` or `npm run build; npm run preview`

## Under the hood

Jacket is essentially a pipeline with the following components:

- A folder watcher which uses the [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) to gain continuous access to a local folder. The handle is saved in IndexedDB and reused on page reload.
- An executor which takes the code, turns it into a JS module and calls `module.program` with the parameters. The `navigator` and canvas are wrapped in a Proxy which is able to track method calls, produced values, etc. The tracked values are given IDs and have their relationships encoded using those IDs. Everything gets stored in a flat array for further processing.
- The visualizer, which turns the flat array into a graph, does some pruning to get rid of nulls and primitives and displays it all in a [React Flow](https://reactflow.dev/) component.

## Todos

- Expose more information
- Improve performance & stability